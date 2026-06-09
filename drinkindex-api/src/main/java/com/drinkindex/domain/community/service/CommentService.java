package com.drinkindex.domain.community.service;

import com.drinkindex.admin.service.AdminLogService;
import com.drinkindex.domain.admin.entity.enums.AdminLogTargetType;
import com.drinkindex.domain.admin.entity.enums.AdminLogType;
import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.*;
import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.repository.*;
import com.drinkindex.domain.score.constant.ScoreActions;
import com.drinkindex.domain.score.service.ScoreService;
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

@Service("communityCommentService")
@RequiredArgsConstructor
public class CommentService {

    private final PostCommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final CommentEmojiReactionRepository reactionRepository;
    private final NotificationService notificationService;
    private final AdminLogService adminLogService;
    private final BadWordFilter badWordFilter;
    private final ScoreService scoreService;

    // ═══════════════════════════════════════════
    // 댓글 목록
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<PostCommentResponse> getComments(Long postId, Long userId, Role currentRole, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").ascending());

        // 차단한 사용자의 댓글은 목록에서 완전히 제외
        List<Long> blockedIds = userId == null
                ? List.of()
                : userBlockRepository.findBlockedIdsByBlockerId(userId);
        boolean hasBlocks = !blockedIds.isEmpty();

        Page<PostComment> roots = hasBlocks
                ? commentRepository.findByPostIdAndParentIsNullAndIsHiddenFalseAndAuthorIdNotIn(
                        postId, blockedIds, pageRequest)
                : commentRepository.findByPostIdAndParentIsNullAndIsHiddenFalse(postId, pageRequest);

        // 루트 댓글 ID 수집
        List<Long> rootIds = roots.stream().map(PostComment::getId).collect(Collectors.toList());

        // 대댓글 일괄 로드 (차단 작성자 제외)
        Map<Long, List<PostComment>> childrenMap = new HashMap<>();
        if (!rootIds.isEmpty()) {
            rootIds.forEach(rootId -> {
                List<PostComment> children = hasBlocks
                        ? commentRepository.findByParentIdAndIsHiddenFalseAndAuthorIdNotInOrderByCreatedAtAsc(
                                rootId, blockedIds)
                        : commentRepository.findByParentIdAndIsHiddenFalseOrderByCreatedAtAsc(rootId);
                childrenMap.put(rootId, children);
            });
        }

        // 전체 댓글 ID (루트 + 대댓글) 수집
        List<Long> allCommentIds = new ArrayList<>(rootIds);
        childrenMap.values().forEach(children ->
                children.forEach(c -> allCommentIds.add(c.getId())));

        // [패치 13] 이모지 반응 일괄 로드 (다형성: POST_COMMENT 대상)
        Map<Long, List<CommentEmojiReaction>> reactionMap = new HashMap<>();
        if (!allCommentIds.isEmpty()) {
            reactionRepository.findByTargetTypeAndTargetIdIn(
                            com.drinkindex.domain.community.entity.enums.EmojiTargetType.POST_COMMENT, allCommentIds)
                    .forEach(r ->
                            reactionMap.computeIfAbsent(r.getTargetId(), k -> new ArrayList<>()).add(r));
        }

        return roots.map(root -> toResponse(root, childrenMap.getOrDefault(root.getId(), List.of()),
                reactionMap, userId, currentRole));
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
        boolean cascadeSecret = false;
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
            // 비밀댓글 캐스케이딩: 부모가 비밀이거나, 형제 대댓글 중 비밀댓글이 하나라도 있으면
            // 이후 모든 대댓글은 강제로 비밀댓글 (서버 강제 — 클라이언트 선택값보다 우선)
            cascadeSecret = Boolean.TRUE.equals(parent.getIsSecret())
                    || commentRepository.existsByParentIdAndIsSecretTrue(parent.getId());
        }

        boolean isPostAuthorAnonymous = Boolean.TRUE.equals(post.getIsAnonymous())
                && post.getAuthor().getId().equals(userId);

        PostComment comment = PostComment.builder()
                .post(post)
                .author(author)
                .parent(parent)
                .content(request.getContent())
                .mentionedUserId(request.getMentionedUserId())
                .isAnonymous(isPostAuthorAnonymous)
                .isSecret(cascadeSecret || Boolean.TRUE.equals(request.getIsSecret()))
                .build();

        PostComment saved = commentRepository.save(comment);
        postRepository.incrementCommentCount(postId);

        // [레벨] 댓글 작성 점수 지급 (일일 한도 적용)
        scoreService.award(userId, ScoreActions.COMMENT_WRITE, "COMMENT", saved.getId());

        // 알림 발송 (비동기)
        sendCommentNotifications(saved, post, parent, request.getMentionedUserId(), userId);

        // 본인이 작성한 댓글이므로 role과 무관하게 항상 열람 가능 (canViewSecret 작성자 본인 분기)
        return toResponse(saved, List.of(), Map.of(), userId, null);
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

        // 본인이 작성한 댓글이므로 role과 무관하게 항상 열람 가능 (canViewSecret 작성자 본인 분기)
        return toResponse(comment, List.of(), Map.of(), userId, null);
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

    @Transactional
    public void hideComment(Long commentId, User actor) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        checkModeratorPermission(actor, comment);
        comment.setHidden(true);
        adminLogService.record(actor, AdminLogType.CONTENT_HIDE,
                AdminLogTargetType.COMMENT, commentId,
                String.format("댓글 숨김 (ID: %d)", commentId), null);
    }

    @Transactional
    public void restoreComment(Long commentId, User actor) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        checkModeratorPermission(actor, comment);
        comment.setHidden(false);
        adminLogService.record(actor, AdminLogType.CONTENT_RESTORE,
                AdminLogTargetType.COMMENT, commentId,
                String.format("댓글 숨김 복구 (ID: %d)", commentId), null);
    }

    private void checkModeratorPermission(User actor, PostComment comment) {
        if (actor.getRole() == Role.SUPER_ADMIN || actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() == Role.MODERATOR && comment.getPost() != null) {
            if (actor.getBoardPermissions().contains(comment.getPost().getBoardType())) return;
        }
        throw new CustomException(ErrorCode.FORBIDDEN);
    }

    // ═══════════════════════════════════════════
    // Private 헬퍼
    // ═══════════════════════════════════════════

    private PostCommentResponse toResponse(PostComment comment, List<PostComment> children,
                                           Map<Long, List<CommentEmojiReaction>> reactionMap,
                                           Long currentUserId, Role currentRole) {
        boolean deleted = comment.isDeleted();

        if (deleted) {
            List<PostCommentResponse> childResponses = children.stream()
                    .map(child -> toResponse(child, List.of(), reactionMap, currentUserId, currentRole))
                    .collect(Collectors.toList());
            return PostCommentResponse.builder()
                    .id(comment.getId())
                    .authorNickname(null)
                    .authorNicknameFixed(null)
                    .content("삭제된 댓글입니다.")
                    .mentionedUserNickname(null)
                    .emojiReactions(List.of())
                    .children(childResponses)
                    .createdAt(comment.getCreatedAt())
                    .isMyComment(false)
                    .isDeleted(true)
                    .isSecret(comment.getIsSecret())
                    .isSecretMasked(false)
                    .build();
        }

        boolean blocked = currentUserId != null
                && !comment.getAuthor().getId().equals(currentUserId)
                && userBlockRepository.existsByBlockerIdAndBlockedId(
                        currentUserId, comment.getAuthor().getId());

        // 비밀댓글: 작성자 본인 + 게시글 작성자 + 최고관리자만 열람 가능, 그 외에는 마스킹
        boolean secretMasked = !blocked
                && Boolean.TRUE.equals(comment.getIsSecret())
                && !canViewSecret(comment, currentUserId, currentRole);

        boolean anon = Boolean.TRUE.equals(comment.getIsAnonymous());
        boolean maskAuthor = blocked || secretMasked || anon;
        String authorNickname = (blocked || secretMasked) ? null : (anon ? "익명" : comment.getAuthor().getNickname());
        String authorRole            = maskAuthor ? null : comment.getAuthor().getRole().name();
        Integer authorLevel          = maskAuthor ? null : comment.getAuthor().getCurrentLevel();
        Integer authorMaturingPower  = maskAuthor ? null : comment.getAuthor().getMaturingPower();
        Boolean authorNicknameFixed  = maskAuthor ? null : comment.getAuthor().getNicknameFixed();
        String authorProfileImageUrl = maskAuthor ? null : comment.getAuthor().getProfileImageUrl();
        String content = blocked ? "차단한 사용자의 댓글입니다"
                : secretMasked ? "비밀 댓글입니다"
                : comment.getContent();

        String mentionedNickname = null;
        if (!blocked && !secretMasked && comment.getMentionedUserId() != null) {
            mentionedNickname = userRepository.findById(comment.getMentionedUserId())
                    .map(User::getNickname).orElse(null);
        }

        List<EmojiReactionSummary> emojiReactions =
                buildEmojiReactionSummaries(reactionMap.getOrDefault(comment.getId(), List.of()), currentUserId);

        List<PostCommentResponse> childResponses = children.stream()
                .map(child -> toResponse(child, List.of(), reactionMap, currentUserId, currentRole))
                .collect(Collectors.toList());

        Long authorId = (blocked || secretMasked || anon) ? null : comment.getAuthor().getId();

        return PostCommentResponse.builder()
                .id(comment.getId())
                .authorNickname(authorNickname)
                .authorRole(authorRole)
                .authorLevel(authorLevel)
                .authorMaturingPower(authorMaturingPower)
                .authorNicknameFixed(authorNicknameFixed)
                .authorProfileImageUrl(authorProfileImageUrl)
                .authorId(authorId)
                .content(content)
                .mentionedUserNickname(mentionedNickname)
                .emojiReactions(emojiReactions)
                .children(childResponses)
                .createdAt(comment.getCreatedAt())
                .isMyComment(currentUserId != null && comment.getAuthor().getId().equals(currentUserId))
                .isDeleted(false)
                .isSecret(comment.getIsSecret())
                .isSecretMasked(secretMasked)
                .build();
    }

    // 비밀댓글 열람 권한: 댓글 작성자 본인 + 게시글 작성자(글쓴이) + 최고관리자(SUPER_ADMIN)
    private boolean canViewSecret(PostComment comment, Long currentUserId, Role currentRole) {
        if (currentUserId == null) return false;
        if (comment.getAuthor().getId().equals(currentUserId)) return true;
        if (comment.getPost() != null && comment.getPost().getAuthor().getId().equals(currentUserId)) return true;
        return currentRole == Role.SUPER_ADMIN;
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
        String boardTargetType = post.getBoardType().name(); // "FREE" 또는 "NOTICE"

        // 게시글 작성자에게 COMMENT 알림 (본인 댓글 제외)
        if (!post.getAuthor().getId().equals(authorId)) {
            notificationService.send(post.getAuthor(), NotificationType.COMMENT,
                    "'" + post.getTitle() + "' 게시글에 댓글이 달렸습니다.", boardTargetType, post.getId());
        }
        // 부모 댓글 작성자에게 REPLY 알림 → 게시글로 이동
        if (parent != null && !parent.getAuthor().getId().equals(authorId)) {
            notificationService.send(parent.getAuthor(), NotificationType.REPLY,
                    "'" + post.getTitle() + "' 게시글에 답글이 달렸습니다.", boardTargetType, post.getId());
        }
        // 멘션된 사용자에게 MENTION 알림 → 게시글로 이동
        if (mentionedUserId != null && !mentionedUserId.equals(authorId)) {
            userRepository.findById(mentionedUserId).ifPresent(mentioned ->
                    notificationService.send(mentioned, NotificationType.MENTION,
                            "'" + post.getTitle() + "' 게시글에서 회원님이 멘션되었습니다.", boardTargetType, post.getId()));
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
