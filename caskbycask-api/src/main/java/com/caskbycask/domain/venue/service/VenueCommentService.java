package com.caskbycask.domain.venue.service;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.venue.dto.VenueCommentImageResponse;
import com.caskbycask.domain.venue.dto.VenueCommentRequest;
import com.caskbycask.domain.venue.dto.VenueCommentResponse;
import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.VenueComment;
import com.caskbycask.domain.venue.entity.VenueCommentImage;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.repository.VenueCommentRepository;
import com.caskbycask.domain.venue.repository.VenueRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.ImagePlanValidator;
import com.caskbycask.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 장소 댓글.
 *
 * <p>주류 댓글과 같은 규칙을 따른다 — 1단 대댓글, 본인만 수정·삭제, 욕설 필터, 소프트 삭제.
 * 다른 점은 사진이 붙는다는 것과, 신고 임계치가 더 엄격하다는 것이다
 * ({@code VENUE_COMMENT_HIDE_THRESHOLD}) — 실제 업소로 손님을 보내는 기능이라
 * 명예훼손성 글이 떠 있는 시간이 그대로 피해가 된다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VenueCommentService {

    private final VenueCommentRepository commentRepository;
    private final VenueCommentImageService imageService;
    private final VenueRepository venueRepository;
    private final UserRepository userRepository;
    private final BadWordFilter badWordFilter;

    // ── 조회 ────────────────────────────────────────────────

    /**
     * 한 장소의 댓글 전부를 트리로.
     *
     * <p>댓글·이미지를 각각 <b>한 번씩만</b> 조회하고 메모리에서 묶는다.
     * 부모별로 대댓글을, 댓글별로 이미지를 조회하면 그대로 N+1 이 된다.
     */
    public List<VenueCommentResponse> getComments(Long venueId) {
        List<VenueComment> all = commentRepository.findAllByVenueForDisplay(venueId);
        if (all.isEmpty()) return List.of();

        Map<Long, List<VenueCommentImage>> imagesByComment =
                imageService.findByCommentIds(all.stream().map(VenueComment::getId).toList());

        Map<Long, List<VenueComment>> repliesByParent = new LinkedHashMap<>();
        List<VenueComment> roots = new ArrayList<>();
        for (VenueComment comment : all) {
            if (comment.isReply()) {
                repliesByParent.computeIfAbsent(comment.getParentId(), key -> new ArrayList<>())
                        .add(comment);
            } else {
                roots.add(comment);
            }
        }

        List<VenueCommentResponse> result = new ArrayList<>(roots.size());
        for (VenueComment root : roots) {
            List<VenueCommentResponse> replies =
                    repliesByParent.getOrDefault(root.getId(), List.of()).stream()
                            .map(reply -> VenueCommentResponse.from(
                                    reply,
                                    imagesByComment.getOrDefault(reply.getId(), List.of()),
                                    List.of()))
                            .toList();
            result.add(VenueCommentResponse.from(
                    root, imagesByComment.getOrDefault(root.getId(), List.of()), replies));
        }
        return result;
    }

    /** 장소 사진 갤러리 — 그 장소의 모든 댓글에 달린 사진을 최신순으로 모은다. */
    public List<VenueCommentImageResponse> getGallery(Long venueId) {
        return imageService.findGallery(venueId).stream()
                .map(VenueCommentImageResponse::from)
                .toList();
    }

    // ── 작성 ────────────────────────────────────────────────

    @Transactional
    public VenueCommentResponse create(Long venueId,
                                       Long userId,
                                       VenueCommentRequest request,
                                       List<MultipartFile> files) {
        Venue venue = findVisibleVenue(venueId);
        User user = findUser(userId);
        badWordFilter.validate(request.content());

        Long parentId = resolveParentId(venueId, request.parentId());

        VenueComment comment = commentRepository.save(VenueComment.builder()
                .venue(venue)
                .user(user)
                .parentId(parentId)
                .content(request.content().trim())
                .build());

        List<VenueCommentImage> images = imageService.attach(comment, files);
        return VenueCommentResponse.from(comment, images, List.of());
    }

    @Transactional
    public VenueCommentResponse update(Long commentId,
                                       Long userId,
                                       VenueCommentRequest request,
                                       List<ImagePlanValidator.PlanItem> imagePlan,
                                       List<MultipartFile> files) {
        VenueComment comment = findOwnedComment(commentId, userId);
        badWordFilter.validate(request.content());

        comment.updateContent(request.content().trim());
        List<VenueCommentImage> images = imageService.replace(comment, imagePlan, files);
        return VenueCommentResponse.from(comment, images, List.of());
    }

    /**
     * 삭제. 대댓글이 달린 부모는 대댓글까지 함께 지운다 —
     * 부모만 지우면 대댓글이 어디에도 매달리지 않아 목록에서 사라진다.
     */
    @Transactional
    public void delete(Long commentId, Long userId) {
        VenueComment comment = findOwnedComment(commentId, userId);

        List<Long> targets = new ArrayList<>();
        targets.add(comment.getId());
        if (!comment.isReply()) {
            commentRepository.findAllByParentId(comment.getId())
                    .forEach(reply -> targets.add(reply.getId()));
        }

        imageService.deleteByCommentIds(targets);
        commentRepository.findAllById(targets).forEach(VenueComment::softDelete);
    }

    /**
     * 장소가 사라질 때의 정리.
     *
     * <p>FK 를 걸지 않는 저장소 규약 때문에 DB 가 대신 지워 주지 않는다 —
     * {@code VenueAdminService.delete} 가 이 메서드를 부른다.
     */
    @Transactional
    public void deleteByVenue(Long venueId) {
        List<VenueComment> comments = commentRepository.findAllByVenueId(venueId);
        if (comments.isEmpty()) return;
        imageService.deleteByCommentIds(comments.stream().map(VenueComment::getId).toList());
        comments.forEach(VenueComment::softDelete);
    }

    // ── 내부 ────────────────────────────────────────────────

    /**
     * 대댓글 대상 확인.
     *
     * <p>2단 중첩을 막는 것과, 다른 장소의 댓글 id 를 부모로 끼워 넣는 것을 함께 막는다.
     */
    private Long resolveParentId(Long venueId, Long parentId) {
        if (parentId == null) return null;
        VenueComment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_COMMENT_NOT_FOUND));
        if (!parent.getVenue().getId().equals(venueId)) {
            throw new CustomException(ErrorCode.VENUE_COMMENT_NOT_FOUND);
        }
        if (parent.isReply()) {
            throw new CustomException(ErrorCode.VENUE_COMMENT_NESTED_REPLY_NOT_ALLOWED);
        }
        return parent.getId();
    }

    private VenueComment findOwnedComment(Long commentId, Long userId) {
        VenueComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_COMMENT_NOT_FOUND));
        if (!comment.isOwnedBy(userId)) {
            throw new CustomException(ErrorCode.VENUE_COMMENT_ACCESS_DENIED);
        }
        return comment;
    }

    /** 비공개·삭제된 장소에는 댓글을 달 수 없다 — 목록에 안 보이는 곳에 글이 쌓이면 안 된다. */
    private Venue findVisibleVenue(Long venueId) {
        return venueRepository.findByIdForDisplay(venueId, VenueStatus.PUBLIC_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_NOT_FOUND));
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
