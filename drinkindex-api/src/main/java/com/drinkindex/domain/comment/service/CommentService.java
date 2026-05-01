package com.drinkindex.domain.comment.service;

import com.drinkindex.domain.comment.dto.CommentRequest;
import com.drinkindex.domain.comment.dto.CommentResponse;
import com.drinkindex.domain.comment.dto.UpdateCommentRequest;
import com.drinkindex.domain.comment.entity.CommentLike;
import com.drinkindex.domain.comment.entity.CommunityComment;
import com.drinkindex.domain.comment.repository.CommentLikeRepository;
import com.drinkindex.domain.comment.repository.CommentRepository;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
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

    // ── 조회 ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(Long spiritId, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<CommunityComment> parents = commentRepository.findParentComments(spiritId, sorted);

        List<Long> parentIds = parents.stream().map(CommunityComment::getId).toList();
        if (parentIds.isEmpty()) {
            return parents.map(c -> CommentResponse.from(c, List.of()));
        }

        Map<Long, List<CommentResponse>> childrenMap = commentRepository
                .findChildrenByParentIds(parentIds)
                .stream()
                .collect(Collectors.groupingBy(
                        c -> c.getParent().getId(),
                        Collectors.mapping(CommentResponse::from, Collectors.toList())
                ));

        return parents.map(c ->
                CommentResponse.from(c, childrenMap.getOrDefault(c.getId(), List.of())));
    }

    // ── 작성 ──────────────────────────────────────────────

    @Transactional
    public CommentResponse createComment(Long spiritId, Long userId, CommentRequest request) {
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
