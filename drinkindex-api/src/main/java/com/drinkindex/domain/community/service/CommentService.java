package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.*;
import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.repository.*;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final PostCommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final CommentEmojiReactionRepository reactionRepository;
    private final NotificationService notificationService;
    private final BadWordFilter badWordFilter;

    // ═══════════════════════════════════════════
    // 댓글 목록
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<PostCommentResponse> getComments(Long postId, Long userId, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<PostComment> roots = commentRepository
                .findByPostIdAndParentIsNullAndDeletedAtIsNullAndIsHiddenFalse(postId, pageRequest);

        // 루트 댓글 ID 수집
        List<Long> rootIds = roots.stream().map(PostComment::getId).collect(Collectors.toList());

        // 대댓글 일괄 로드
        Map<Long, List<PostComment>> childrenMap = new HashMap<>();
        if (!rootIds.isEmpty()) {
            rootIds.forEach(rootId -> {
                List<PostComment> children = commentRepository
                        .findByParentIdAndDeletedAtIsNullAndIsHiddenFalseOrderByCreatedAtAsc(rootId);
                childrenMap.put(rootId, children);
            });
        }

        // 전체 댓글 ID (루트 + 대댓글) 수집
        List<Long> allCommentIds = new ArrayList<>(rootIds);
        childrenMap.values().forEach(children ->
                children.forEach(c -> allCommentIds.add(c.getId())));

        // 이모지 반응 일괄 로드
        Map<Long, List<CommentEmojiReaction>> reactionMap = new HashMap<>();
        if (!allCommentIds.isEmpty()) {
            reactionRepository.findByCommentIdIn(allCommentIds).forEach(r ->
                    reactionMap.computeIfAbsent(r.getComment().getId(), k -> new ArrayList<>()).add(r));
        }

        // 차단 사용자 집합 (로그인 시)
        Set<Long> blockedIds = new HashSet<>();
        if (userId != null) {
            // 현재 유저가 차단한 사람들의 ID는 UserBlock에서 blocker=currentUser
            // UserBlockRepository에 findBlockedIdsByBlockerId 가 없으므로 단순 체크는 서비스에서 처리
        }

        return roots.map(root -> toResponse(root, childrenMap.getOrDefault(root.getId(), List.of()),
                reactionMap, userId));
    }

    // ═══════════════════════════════════════════
    // 댓글 작성
    // ═══════════════════════════════════════════

    @Transactional
    public PostCommentResponse createComment(Long postId, CreateCommentRequest request, Long userId) {
        badWordFilter.validate(request.getContent());

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
        User author = findUser(userId);

        PostComment parent = null;
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
            // 같은 게시글 소속 확인
            if (parent.getPost() == null || !parent.getPost().getId().equals(postId)) {
                throw new CustomException(ErrorCode.COMMENT_NOT_FOUND);
            }
            // 2단계 이상 중첩 불가
            if (parent.getParent() != null) {
                throw new CustomException(ErrorCode.NESTED_REPLY_NOT_ALLOWED);
            }
        }

        PostComment comment = PostComment.builder()
                .post(post)
                .author(author)
                .parent(parent)
                .content(request.getContent())
                .mentionedUserId(request.getMentionedUserId())
                .build();

        PostComment saved = commentRepository.save(comment);
        postRepository.incrementCommentCount(postId);

        // 알림 발송 (비동기)
        sendCommentNotifications(saved, post, parent, request.getMentionedUserId(), userId);

        return toResponse(saved, List.of(), Map.of(), userId);
    }

    // ═══════════════════════════════════════════
    // 댓글 수정
    // ═══════════════════════════════════════════

    @Transactional
    public PostCommentResponse updateComment(Long postId, Long commentId,
                                             UpdateCommentRequest request, Long userId) {
        badWordFilter.validate(request.getContent());
        PostComment comment = findComment(commentId, postId);

        if (!comment.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.COMMENT_ACCESS_DENIED);
        }
        comment.updateContent(request.getContent());

        return toResponse(comment, List.of(), Map.of(), userId);
    }

    // ═══════════════════════════════════════════
    // 댓글 삭제 (Soft Delete)
    // ═══════════════════════════════════════════

    @Transactional
    public void deleteComment(Long postId, Long commentId, Long userId) {
        PostComment comment = findComment(commentId, postId);
        User user = findUser(userId);
        boolean isAdmin = Role.ADMIN.equals(user.getRole());

        if (!comment.getAuthor().getId().equals(userId) && !isAdmin) {
            throw new CustomException(ErrorCode.COMMENT_ACCESS_DENIED);
        }
        comment.softDelete();

        if (comment.getPost() != null) {
            postRepository.decrementCommentCount(postId);
        }
    }

    // ═══════════════════════════════════════════
    // Private 헬퍼
    // ═══════════════════════════════════════════

    private PostCommentResponse toResponse(PostComment comment, List<PostComment> children,
                                           Map<Long, List<CommentEmojiReaction>> reactionMap,
                                           Long currentUserId) {
        boolean blocked = currentUserId != null
                && !comment.getAuthor().getId().equals(currentUserId)
                && userBlockRepository.existsByBlockerIdAndBlockedId(
                        currentUserId, comment.getAuthor().getId());

        String authorNickname = blocked ? null
                : (Boolean.TRUE.equals(comment.getIsAnonymous()) ? "익명"
                        : comment.getAuthor().getNickname());
        String content = blocked ? "차단한 사용자의 댓글입니다" : comment.getContent();

        String mentionedNickname = null;
        if (comment.getMentionedUserId() != null) {
            mentionedNickname = userRepository.findById(comment.getMentionedUserId())
                    .map(User::getNickname).orElse(null);
        }

        List<EmojiReactionSummary> emojiReactions =
                buildEmojiReactionSummaries(reactionMap.getOrDefault(comment.getId(), List.of()), currentUserId);

        List<PostCommentResponse> childResponses = children.stream()
                .map(child -> toResponse(child, List.of(), reactionMap, currentUserId))
                .collect(Collectors.toList());

        return PostCommentResponse.builder()
                .id(comment.getId())
                .authorNickname(authorNickname)
                .content(content)
                .mentionedUserNickname(mentionedNickname)
                .emojiReactions(emojiReactions)
                .children(childResponses)
                .createdAt(comment.getCreatedAt())
                .isMyComment(currentUserId != null && comment.getAuthor().getId().equals(currentUserId))
                .build();
    }

    private List<EmojiReactionSummary> buildEmojiReactionSummaries(
            List<CommentEmojiReaction> reactions, Long currentUserId) {
        // emoji.id 기준으로 그룹화
        Map<Long, List<CommentEmojiReaction>> grouped = reactions.stream()
                .collect(Collectors.groupingBy(r -> r.getEmoji().getId()));

        return grouped.entrySet().stream()
                .map(entry -> {
                    Long emojiId = entry.getKey();
                    List<CommentEmojiReaction> group = entry.getValue();
                    CommunityEmoji emoji = group.get(0).getEmoji();
                    boolean isMyReaction = currentUserId != null
                            && group.stream().anyMatch(r -> r.getUser().getId().equals(currentUserId));
                    return new EmojiReactionSummary(emojiId, emoji.getUnicode(),
                            emoji.getImageUrl(), group.size(), isMyReaction);
                })
                .collect(Collectors.toList());
    }

    private void sendCommentNotifications(PostComment comment, Post post, PostComment parent,
                                          Long mentionedUserId, Long authorId) {
        // 게시글 작성자에게 COMMENT 알림 (본인 댓글 제외)
        if (!post.getAuthor().getId().equals(authorId)) {
            notificationService.send(post.getAuthor(), NotificationType.COMMENT,
                    "'" + post.getTitle() + "' 게시글에 댓글이 달렸습니다.", "POST", post.getId());
        }
        // 부모 댓글 작성자에게 REPLY 알림
        if (parent != null && !parent.getAuthor().getId().equals(authorId)) {
            notificationService.send(parent.getAuthor(), NotificationType.REPLY,
                    "회원님의 댓글에 답글이 달렸습니다.", "COMMENT", parent.getId());
        }
        // 멘션된 사용자에게 MENTION 알림
        if (mentionedUserId != null && !mentionedUserId.equals(authorId)) {
            userRepository.findById(mentionedUserId).ifPresent(mentioned ->
                    notificationService.send(mentioned, NotificationType.MENTION,
                            "댓글에서 회원님이 멘션되었습니다.", "COMMENT", comment.getId()));
        }
    }

    private PostComment findComment(Long commentId, Long postId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        // 같은 게시글 소속 확인 (post가 null이면 게시글이 삭제된 것)
        if (comment.getPost() == null || !comment.getPost().getId().equals(postId)) {
            throw new CustomException(ErrorCode.COMMENT_NOT_FOUND);
        }
        return comment;
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
