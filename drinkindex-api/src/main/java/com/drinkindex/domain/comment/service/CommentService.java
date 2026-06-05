package com.drinkindex.domain.comment.service;

import com.drinkindex.domain.comment.dto.CommentRequest;
import com.drinkindex.domain.comment.dto.CommentResponse;
import com.drinkindex.domain.comment.dto.UpdateCommentRequest;
import com.drinkindex.domain.comment.entity.CommentLike;
import com.drinkindex.domain.comment.entity.CommunityComment;
import com.drinkindex.domain.comment.repository.CommentLikeRepository;
import com.drinkindex.domain.comment.repository.CommentRepository;
import com.drinkindex.domain.community.dto.EmojiReactionSummary;
import com.drinkindex.domain.community.dto.EmojiReactionToggleResponse;
import com.drinkindex.domain.community.entity.CommentEmojiReaction;
import com.drinkindex.domain.community.entity.CommunityEmoji;
import com.drinkindex.domain.community.entity.enums.EmojiTargetType;
import com.drinkindex.domain.community.repository.CommentEmojiReactionRepository;
import com.drinkindex.domain.community.service.EmojiService;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final SpiritRepository spiritRepository;
    private final UserRepository userRepository;
    private final BadWordFilter badWordFilter;
    // [패치 13] 술 상세 댓글 이모지 반응 (게시판 댓글과 통일)
    private final CommentEmojiReactionRepository reactionRepository;
    private final EmojiService emojiService;

    // ── 조회 ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(Long spiritId, Long currentUserId, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<CommunityComment> parents = commentRepository.findParentComments(spiritId, sorted);

        List<Long> parentIds = parents.stream().map(CommunityComment::getId).toList();
        if (parentIds.isEmpty()) {
            return parents.map(c -> CommentResponse.from(c, List.of(), List.of()));
        }

        List<CommunityComment> children = commentRepository.findChildrenByParentIds(parentIds);

        // [패치 13] 전체 댓글(부모 + 대댓글) ID에 대한 이모지 반응 일괄 로드 (SPIRIT_COMMENT)
        List<Long> allCommentIds = new java.util.ArrayList<>(parentIds);
        children.forEach(c -> allCommentIds.add(c.getId()));
        Map<Long, List<CommentEmojiReaction>> reactionMap = new java.util.HashMap<>();
        reactionRepository.findByTargetTypeAndTargetIdIn(EmojiTargetType.SPIRIT_COMMENT, allCommentIds)
                .forEach(r -> reactionMap.computeIfAbsent(r.getTargetId(), k -> new java.util.ArrayList<>()).add(r));

        Map<Long, List<CommentResponse>> childrenMap = children.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getParent().getId(),
                        Collectors.mapping(
                                c -> CommentResponse.from(c,
                                        buildEmojiReactionSummaries(reactionMap.getOrDefault(c.getId(), List.of()), currentUserId),
                                        List.of()),
                                Collectors.toList())
                ));

        return parents.map(c ->
                CommentResponse.from(c,
                        buildEmojiReactionSummaries(reactionMap.getOrDefault(c.getId(), List.of()), currentUserId),
                        childrenMap.getOrDefault(c.getId(), List.of())));
    }

    // [패치 13] 술 상세 댓글 이모지 반응 토글 — 게시판 댓글과 동일 패턴(targetType=SPIRIT_COMMENT)
    @Transactional
    public EmojiReactionToggleResponse toggleEmojiReaction(Long commentId, Long emojiId, Long userId) {
        return emojiService.toggleReaction(EmojiTargetType.SPIRIT_COMMENT, commentId, emojiId, userId);
    }

    // [패치 13] 이모지 반응 요약 빌드 (community CommentService와 동일 규칙)
    private List<EmojiReactionSummary> buildEmojiReactionSummaries(
            List<CommentEmojiReaction> reactions, Long currentUserId) {
        Map<Long, List<CommentEmojiReaction>> grouped = reactions.stream()
                .collect(Collectors.groupingBy(r -> r.getEmoji().getId()));

        return grouped.entrySet().stream()
                .map(entry -> {
                    List<CommentEmojiReaction> group = entry.getValue();
                    CommunityEmoji emoji = group.get(0).getEmoji();
                    boolean isMyReaction = currentUserId != null
                            && group.stream().anyMatch(r -> r.getUser().getId().equals(currentUserId));
                    return new EmojiReactionSummary(entry.getKey(), emoji.getUnicode(),
                            emoji.getImageUrl(), group.size(), isMyReaction);
                })
                .collect(Collectors.toList());
    }

    // ── 작성 ──────────────────────────────────────────────

    @Transactional
    public CommentResponse createComment(Long spiritId, Long userId, CommentRequest request) {
        // [패치 5] 술 상세 커뮤니티 댓글 욕설 필터 (기존 누락 영역)
        badWordFilter.validate(request.content());

        Spirit spirit = spiritRepository.findByIdAndStatus(spiritId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        User user = getUser(userId);

        CommunityComment parent = null;
        if (request.parentId() != null) {
            parent = commentRepository.findByIdAndSpiritId(request.parentId(), spiritId)
                    .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

            if (parent.getParent() != null) {
                throw new CustomException(ErrorCode.NESTED_REPLY_NOT_ALLOWED);
            }
        }

        CommunityComment comment = CommunityComment.builder()
                .spirit(spirit)
                .user(user)
                .parent(parent)
                .content(request.content())
                .build();

        return CommentResponse.from(commentRepository.save(comment));
    }

    // ── 수정 ──────────────────────────────────────────────

    @Transactional
    public CommentResponse updateComment(Long spiritId, Long commentId, Long userId,
                                         UpdateCommentRequest request) {
        CommunityComment comment = getComment(spiritId, commentId);
        checkOwnership(comment, userId);

        // [패치 5] 술 상세 커뮤니티 댓글 수정 시 욕설 필터
        badWordFilter.validate(request.content());

        comment.updateContent(request.content());
        return CommentResponse.from(comment);
    }

    // ── 삭제 ──────────────────────────────────────────────

    @Transactional
    public void deleteComment(Long spiritId, Long commentId, Long userId, Role role) {
        CommunityComment comment = getComment(spiritId, commentId);
        checkOwnershipOrAdmin(comment, userId, role);

        comment.softDelete();
    }

    // ── 좋아요 토글 ───────────────────────────────────────

    @Transactional
    public void toggleLike(Long commentId, Long userId) {
        CommunityComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

        User user = getUser(userId);

        if (commentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            commentLikeRepository.deleteByCommentIdAndUserId(commentId, userId);
            comment.decrementLikeCount();
        } else {
            CommentLike like = CommentLike.builder()
                    .comment(comment)
                    .user(user)
                    .build();
            commentLikeRepository.save(like);
            comment.incrementLikeCount();
        }
    }

    // ── Private helpers ────────────────────────────────────

    private CommunityComment getComment(Long spiritId, Long commentId) {
        return commentRepository.findByIdAndSpiritId(commentId, spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void checkOwnership(CommunityComment comment, Long userId) {
        if (!comment.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.COMMENT_ACCESS_DENIED);
        }
    }

    private void checkOwnershipOrAdmin(CommunityComment comment, Long userId, Role role) {
        boolean isOwner = comment.getUser().getId().equals(userId);
        boolean isAdmin = role == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new CustomException(ErrorCode.COMMENT_ACCESS_DENIED);
        }
    }
}
