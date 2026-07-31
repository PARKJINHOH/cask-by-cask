package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.*;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.entity.enums.VariantReviewRequestStatus;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.review.repository.SpiritVariantReviewRequestRepository;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.spirit.dto.SpiritCommonDetailRequest;
import com.caskbycask.domain.spirit.dto.WhiskyDetailRequest;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.service.SpiritDetailService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VariantReviewRequestService {

    private static final String TARGET_SPIRIT = "SPIRIT";
    private static final String TARGET_VARIANT_REVIEW_REQUEST = "SPIRIT_VARIANT_REVIEW_REQUEST";

    private final SpiritVariantReviewRequestRepository requestRepository;
    private final SpiritRepository spiritRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ReviewService reviewService;
    private final ScoreService scoreService;
    private final SpiritDetailService spiritDetailService;
    private final BadWordFilter badWordFilter;
    private final EmailSender emailSender;
    private final NotificationService notificationService;
    private final SocialPublishRequestService socialPublishRequestService;
    private final ReviewImageService reviewImageService;

    @Transactional
    public VariantReviewRequestResponse create(Long spiritId, Long userId, CreateVariantReviewRequest request) {
        return create(spiritId, userId, request, List.of());
    }

    @Transactional
    public VariantReviewRequestResponse create(Long spiritId, Long userId,
                                               CreateVariantReviewRequest request,
                                               List<MultipartFile> images) {
        Spirit selected = spiritRepository.findByIdAndStatus(spiritId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        Spirit master = selected.getParent() != null ? selected.getParent() : selected;
        User requester = userRepository.getByIdOrThrow(userId);

        VariantType variantType = resolveVariantType(master);
        String seriesIdentifier = resolveSeriesIdentifier(master);
        String seriesIdentifierEn = resolveSeriesIdentifierEn(master, seriesIdentifier);
        if (variantType == null || variantType == VariantType.NONE || !StringUtils.hasText(seriesIdentifier)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        badWordFilter.validate(request.comment());

        SpiritVariantReviewRequest saved = requestRepository.save(SpiritVariantReviewRequest.builder()
                .masterSpirit(master)
                .requestUser(requester)
                .variantType(variantType)
                .variantValue(request.variantValue().trim())
                .variantValueEn(normalize(request.variantValueEn()))
                .seriesIdentifier(seriesIdentifier)
                .seriesIdentifierEn(seriesIdentifierEn)
                .abv(request.abv())
                .volumeMl(request.volumeMl())
                .requestMemo(normalize(request.requestMemo()))
                .noseScore(request.noseScore())
                .tasteScore(request.tasteScore())
                .finishScore(request.finishScore())
                .noseNote(normalize(request.noseNote()))
                .tasteNote(normalize(request.tasteNote()))
                .finishNote(normalize(request.finishNote()))
                .comment(normalize(request.comment()))
                .noseAromaWheelNotes(normalize(request.noseAromaWheelNotes()))
                .tasteAromaWheelNotes(normalize(request.tasteAromaWheelNotes()))
                .finishAromaWheelNotes(normalize(request.finishAromaWheelNotes()))
                .build());

        var savedImages = reviewImageService.saveForVariantRequest(saved, images);
        socialPublishRequestService.requestVariantReview(saved, requester, request.socialPublish());
        return VariantReviewRequestResponse.from(
                saved, savedImages.stream().map(ReviewImageResponse::from).toList());
    }

    @Transactional(readOnly = true)
    public Page<VariantReviewRequestResponse> getMyRequests(Long userId, VariantReviewRequestStatus status, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<SpiritVariantReviewRequest> requests =
                requestRepository.findByRequester(userId, status, sorted);
        var imagesByRequest = reviewImageService.findByVariantRequestIds(
                requests.getContent().stream()
                        .map(SpiritVariantReviewRequest::getId)
                        .toList());
        return requests.map(request -> VariantReviewRequestResponse.from(
                request,
                imagesByRequest.getOrDefault(request.getId(), List.of()).stream()
                        .map(ReviewImageResponse::from)
                        .toList()));
    }

    @Transactional
    public VariantReviewRequestResponse updateMyRequest(Long requestId, Long userId, CreateVariantReviewRequest update) {
        return updateMyRequest(requestId, userId, update, null, List.of());
    }

    @Transactional
    public VariantReviewRequestResponse updateMyRequest(
            Long requestId, Long userId, CreateVariantReviewRequest update,
            List<ReviewImagePlanItem> imagePlan, List<MultipartFile> images) {
        SpiritVariantReviewRequest request = getEditableMyRequest(requestId, userId);
        badWordFilter.validate(update.comment());
        request.updatePending(
                update.variantValue().trim(),
                normalize(update.variantValueEn()),
                update.abv(),
                update.volumeMl(),
                normalize(update.requestMemo()),
                update.noseScore(),
                update.tasteScore(),
                update.finishScore(),
                normalize(update.noseNote()),
                normalize(update.tasteNote()),
                normalize(update.finishNote()),
                normalize(update.comment()),
                normalize(update.noseAromaWheelNotes()),
                normalize(update.tasteAromaWheelNotes()),
                normalize(update.finishAromaWheelNotes())
        );
        var updatedImages = reviewImageService.replaceForVariantRequest(request, imagePlan, images);
        socialPublishRequestService.refreshWaitingVariantReviewMedia(request);
        return VariantReviewRequestResponse.from(
                request, updatedImages.stream().map(ReviewImageResponse::from).toList());
    }

    @Transactional
    public void deleteMyRequest(Long requestId, Long userId) {
        SpiritVariantReviewRequest request = getEditableMyRequest(requestId, userId);
        socialPublishRequestService.cancelOrigin(SocialSourceType.VARIANT_REVIEW_REQUEST, requestId);
        reviewImageService.deleteForVariantRequest(requestId);
        requestRepository.delete(request);
    }

    @Transactional
    public VariantReviewRequestResponse resubmitMyReview(Long requestId, Long userId, CreateVariantReviewRequest update) {
        return resubmitMyReview(requestId, userId, update, null, List.of());
    }

    @Transactional
    public VariantReviewRequestResponse resubmitMyReview(
            Long requestId, Long userId, CreateVariantReviewRequest update,
            List<ReviewImagePlanItem> imagePlan, List<MultipartFile> images) {
        SpiritVariantReviewRequest request = getReviewOnlyRejectedMyRequest(requestId, userId);
        Spirit linkedVariant = request.getLinkedVariant();

        badWordFilter.validate(update.comment());
        request.resubmitReview(
                linkedVariant.getVariantValue(),
                normalize(linkedVariant.getVariantValueEn()),
                linkedVariant.getAbv(),
                linkedVariant.getVolumeMl(),
                request.getRequestMemo(),
                update.noseScore(),
                update.tasteScore(),
                update.finishScore(),
                normalize(update.noseNote()),
                normalize(update.tasteNote()),
                normalize(update.finishNote()),
                normalize(update.comment()),
                normalize(update.noseAromaWheelNotes()),
                normalize(update.tasteAromaWheelNotes()),
                normalize(update.finishAromaWheelNotes())
        );
        var updatedImages = reviewImageService.replaceForVariantRequest(request, imagePlan, images);
        return VariantReviewRequestResponse.from(
                request, updatedImages.stream().map(ReviewImageResponse::from).toList());
    }

    @Transactional(readOnly = true)
    public Page<AdminVariantReviewRequestResponse> getAdminRequests(
            VariantReviewRequestStatus status,
            String keyword,
            Pageable pageable
    ) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        String normalizedKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        Page<SpiritVariantReviewRequest> requests =
                requestRepository.findForAdmin(status, normalizedKeyword, sorted);
        var imagesByRequest = reviewImageService.findByVariantRequestIds(
                requests.getContent().stream()
                        .map(SpiritVariantReviewRequest::getId)
                        .toList());
        return requests.map(request -> AdminVariantReviewRequestResponse.from(
                request,
                imagesByRequest.getOrDefault(request.getId(), List.of()).stream()
                        .map(ReviewImageResponse::from)
                        .toList()));
    }

    @Transactional
    public AdminVariantReviewRequestResponse approve(Long requestId, ApproveVariantReviewRequest approval, Long adminUserId) {
        SpiritVariantReviewRequest request = getPendingRequest(requestId);
        User admin = userRepository.getByIdOrThrow(adminUserId);
        Long targetVariantId = approval != null ? approval.targetVariantId() : null;
        Spirit variant;
        boolean merged = targetVariantId != null;

        if (merged) {
            variant = spiritRepository.findByIdAndStatus(targetVariantId, SpiritStatus.ACTIVE)
                    .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
            if (variant.getParent() == null || !variant.getParent().getId().equals(request.getMasterSpirit().getId())) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        } else {
            applyApprovalEditionData(request, approval);
            variant = createVariant(request);
            saveApprovalDetails(variant, request, approval);
        }

        Review review = reviewRepository.save(Review.builder()
                .spirit(variant)
                .user(request.getRequestUser())
                .noseScore(request.getNoseScore())
                .tasteScore(request.getTasteScore())
                .finishScore(request.getFinishScore())
                .noseNote(request.getNoseNote())
                .tasteNote(request.getTasteNote())
                .finishNote(request.getFinishNote())
                .comment(request.getComment())
                .noseAromaWheelNotes(request.getNoseAromaWheelNotes())
                .tasteAromaWheelNotes(request.getTasteAromaWheelNotes())
                .finishAromaWheelNotes(request.getFinishAromaWheelNotes())
                .build());

        List<ReviewImageResponse> responseImages =
                reviewImageService.findByVariantRequestId(request.getId()).stream()
                        .map(ReviewImageResponse::from)
                        .toList();
        reviewService.recalculateAvgScore(variant.getId());
        scoreService.award(request.getRequestUser().getId(), ScoreActions.SPIRIT_REVIEW_WRITE, "SPIRIT_REVIEW", review.getId());
        reviewImageService.transferToReview(request.getId(), review);
        request.approve(variant, review, admin, merged);
        socialPublishRequestService.bindVariantReview(request.getId(), review.getId());
        sendVariantReviewApprovedNotification(request, variant, merged);

        return AdminVariantReviewRequestResponse.from(request, responseImages);
    }

    @Transactional
    public AdminVariantReviewRequestResponse approveSavedVariant(Long requestId, Long targetVariantId, Long adminUserId) {
        if (targetVariantId == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        SpiritVariantReviewRequest request = getPendingRequest(requestId);
        User admin = userRepository.getByIdOrThrow(adminUserId);
        Spirit variant = spiritRepository.findByIdAndStatus(targetVariantId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        if (variant.getParent() == null || !variant.getParent().getId().equals(request.getMasterSpirit().getId())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (!StringUtils.hasText(variant.getVariantValue())
                || variant.getAbv() == null
                || variant.getVolumeMl() == null
                || variant.getAbv().compareTo(java.math.BigDecimal.ZERO) < 0
                || variant.getAbv().compareTo(java.math.BigDecimal.valueOf(100)) > 0
                || variant.getVolumeMl() < 1
                || variant.getVolumeMl() > 100000) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        request.applyEditionData(
                variant.getVariantValue(),
                normalize(variant.getVariantValueEn()),
                variant.getAbv(),
                variant.getVolumeMl()
        );

        Review review = reviewRepository.save(Review.builder()
                .spirit(variant)
                .user(request.getRequestUser())
                .noseScore(request.getNoseScore())
                .tasteScore(request.getTasteScore())
                .finishScore(request.getFinishScore())
                .noseNote(request.getNoseNote())
                .tasteNote(request.getTasteNote())
                .finishNote(request.getFinishNote())
                .comment(request.getComment())
                .noseAromaWheelNotes(request.getNoseAromaWheelNotes())
                .tasteAromaWheelNotes(request.getTasteAromaWheelNotes())
                .finishAromaWheelNotes(request.getFinishAromaWheelNotes())
                .build());

        List<ReviewImageResponse> responseImages =
                reviewImageService.findByVariantRequestId(request.getId()).stream()
                        .map(ReviewImageResponse::from)
                        .toList();
        reviewService.recalculateAvgScore(variant.getId());
        scoreService.award(request.getRequestUser().getId(), ScoreActions.SPIRIT_REVIEW_WRITE, "SPIRIT_REVIEW", review.getId());
        reviewImageService.transferToReview(request.getId(), review);
        request.approve(variant, review, admin, false);
        socialPublishRequestService.bindVariantReview(request.getId(), review.getId());
        sendVariantReviewApprovedNotification(request, variant, false);

        return AdminVariantReviewRequestResponse.from(request, responseImages);
    }

    @Transactional
    public AdminVariantReviewRequestResponse rejectReviewOnly(Long requestId, Long targetVariantId, Long adminUserId, String rejectReason) {
        if (targetVariantId == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        String reason = normalize(rejectReason);
        if (reason == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        SpiritVariantReviewRequest request = getPendingRequest(requestId);
        User admin = userRepository.getByIdOrThrow(adminUserId);
        Spirit variant = spiritRepository.findByIdAndStatus(targetVariantId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        if (variant.getParent() == null || !variant.getParent().getId().equals(request.getMasterSpirit().getId())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (!StringUtils.hasText(variant.getVariantValue())
                || variant.getAbv() == null
                || variant.getVolumeMl() == null
                || variant.getAbv().compareTo(java.math.BigDecimal.ZERO) < 0
                || variant.getAbv().compareTo(java.math.BigDecimal.valueOf(100)) > 0
                || variant.getVolumeMl() < 1
                || variant.getVolumeMl() > 100000) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        request.applyEditionData(
                variant.getVariantValue(),
                normalize(variant.getVariantValueEn()),
                variant.getAbv(),
                variant.getVolumeMl()
        );
        request.rejectReviewOnly(variant, admin, reason);
        socialPublishRequestService.cancelOrigin(SocialSourceType.VARIANT_REVIEW_REQUEST, request.getId());
        sendReviewOnlyRejectedNotification(request, reason);

        return AdminVariantReviewRequestResponse.from(
                request,
                reviewImageService.findByVariantRequestId(request.getId()).stream()
                        .map(ReviewImageResponse::from)
                        .toList());
    }

    @Transactional
    public void reject(Long requestId, Long adminUserId, ModerationRequest moderation) {
        SpiritVariantReviewRequest request = getPendingRequest(requestId);
        User admin = userRepository.getByIdOrThrow(adminUserId);
        String reason = normalize(moderation != null ? moderation.reason() : null);
        request.reject(admin, reason);
        socialPublishRequestService.cancelOrigin(SocialSourceType.VARIANT_REVIEW_REQUEST, request.getId());
        sendVariantReviewRejectedNotification(request, reason);

        if (moderation != null && moderation.shouldSendEmail()) {
            sendEmailSafely(
                    request.getRequestUser().getEmail(),
                    "[CaskByCask] 하위 에디션/리뷰 요청 반려 안내",
                    buildVariantReviewRejectEmail(request, reason)
            );
        }
    }

    private SpiritVariantReviewRequest getPendingRequest(Long requestId) {
        SpiritVariantReviewRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        if (request.getStatus() != VariantReviewRequestStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return request;
    }

    private SpiritVariantReviewRequest getEditableMyRequest(Long requestId, Long userId) {
        SpiritVariantReviewRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        if (!request.getRequestUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.REVIEW_ACCESS_DENIED);
        }
        if (request.getStatus() != VariantReviewRequestStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return request;
    }

    private SpiritVariantReviewRequest getReviewOnlyRejectedMyRequest(Long requestId, Long userId) {
        SpiritVariantReviewRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        if (!request.getRequestUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.REVIEW_ACCESS_DENIED);
        }
        if (request.getStatus() != VariantReviewRequestStatus.REJECTED
                || request.getLinkedVariant() == null
                || request.getReview() != null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return request;
    }

    private Spirit createVariant(SpiritVariantReviewRequest request) {
        Spirit master = request.getMasterSpirit();
        int displayOrder = spiritRepository.findByParentId(master.getId()).size();
        return spiritRepository.save(Spirit.builder()
                .nameKo(master.getNameKo())
                .nameEn(master.getNameEn())
                .category(master.getCategory())
                .producer(master.getProducer())
                .vintageYear(master.getVintageYear())
                .abv(request.getAbv())
                .volumeMl(request.getVolumeMl())
                .country(master.getCountry())
                .region(master.getRegion())
                .status(SpiritStatus.ACTIVE)
                .registeredBy(request.getRequestUser())
                .parent(master)
                .variantType(request.getVariantType())
                .variantValue(request.getVariantValue())
                .variantValueEn(request.getVariantValueEn())
                .seriesIdentifier(request.getSeriesIdentifier())
                .seriesIdentifierEn(request.getSeriesIdentifierEn())
                .abvMin(null)
                .abvMax(null)
                .volumeMlMin(null)
                .volumeMlMax(null)
                .displayOrder(displayOrder)
                .build());
    }

    private void applyApprovalEditionData(SpiritVariantReviewRequest request, ApproveVariantReviewRequest approval) {
        String variantValue = normalize(approval != null ? approval.variantValue() : null);
        if (variantValue == null) {
            variantValue = normalize(request.getVariantValue());
        }
        String variantValueEn = normalize(approval != null ? approval.variantValueEn() : null);
        if (variantValueEn == null) {
            variantValueEn = normalize(request.getVariantValueEn());
        }
        var abv = approval != null && approval.abv() != null ? approval.abv() : request.getAbv();
        var volumeMl = approval != null && approval.volumeMl() != null ? approval.volumeMl() : request.getVolumeMl();

        if (variantValue == null || abv == null || volumeMl == null
                || abv.compareTo(java.math.BigDecimal.ZERO) < 0
                || abv.compareTo(java.math.BigDecimal.valueOf(100)) > 0
                || volumeMl < 1 || volumeMl > 100000) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        request.applyEditionData(variantValue, variantValueEn, abv, volumeMl);
    }

    private void saveApprovalDetails(Spirit variant, SpiritVariantReviewRequest request, ApproveVariantReviewRequest approval) {
        spiritDetailService.saveCommonDetail(variant, new SpiritCommonDetailRequest(
                false,
                approval != null ? approval.ageStatement() : null,
                approval != null ? approval.ageStatementMonths() : null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                request.getVolumeMl(),
                request.getAbv(),
                null,
                normalize(approval != null ? approval.batchNo() : null),
                null
        ));

        if (variant.getCategory() != SpiritCategory.WHISKY) {
            return;
        }

        String caskNo = normalize(approval != null ? approval.caskNo() : null);
        String detailNotes = normalize(approval != null ? approval.detailNotes() : null);
        if (caskNo == null && detailNotes == null) {
            return;
        }

        spiritDetailService.saveWhiskyDetail(variant, new WhiskyDetailRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                caskNo,
                detailNotes
        ));
    }

    private VariantType resolveVariantType(Spirit master) {
        if (master.getVariantType() != null && master.getVariantType() != VariantType.NONE) {
            return master.getVariantType();
        }
        return spiritRepository.findByParentId(master.getId()).stream()
                .filter(v -> v.getStatus() == SpiritStatus.ACTIVE)
                .map(Spirit::getVariantType)
                .filter(type -> type != null && type != VariantType.NONE)
                .findFirst()
                .orElse(null);
    }

    private String resolveSeriesIdentifier(Spirit master) {
        String direct = normalize(master.getSeriesIdentifier());
        if (direct != null) return direct;
        return spiritRepository.findByParentId(master.getId()).stream()
                .filter(v -> v.getStatus() == SpiritStatus.ACTIVE)
                .map(Spirit::getSeriesIdentifier)
                .map(this::normalize)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    private String resolveSeriesIdentifierEn(Spirit master, String fallback) {
        String direct = normalize(master.getSeriesIdentifierEn());
        if (direct != null) return direct;
        return spiritRepository.findByParentId(master.getId()).stream()
                .filter(v -> v.getStatus() == SpiritStatus.ACTIVE)
                .map(Spirit::getSeriesIdentifierEn)
                .map(this::normalize)
                .filter(value -> value != null)
                .findFirst()
                .orElse(fallback);
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) return null;
        return value.trim();
    }

    private void sendVariantReviewApprovedNotification(
            SpiritVariantReviewRequest request,
            Spirit variant,
            boolean merged
    ) {
        String editionLabel = buildEditionLabel(request);
        String message = merged
                ? "요청하신 '" + request.getMasterSpirit().getNameKo() + " " + editionLabel + "' 리뷰가 기존 하위 에디션에 연결되어 승인되었습니다."
                : "요청하신 '" + request.getMasterSpirit().getNameKo() + " " + editionLabel + "' 리뷰가 승인되어 공개되었습니다.";
        notificationService.send(
                request.getRequestUser(),
                NotificationType.REQUEST_APPROVED,
                message,
                TARGET_SPIRIT,
                variant.getId()
        );
    }

    private void sendReviewOnlyRejectedNotification(SpiritVariantReviewRequest request, String reason) {
        String message = "요청하신 '" + request.getMasterSpirit().getNameKo() + " "
                + buildEditionLabel(request) + "' 리뷰가 미승인되었습니다."
                + appendReason(reason);
        notificationService.send(
                request.getRequestUser(),
                NotificationType.REQUEST_REJECTED,
                message,
                TARGET_VARIANT_REVIEW_REQUEST,
                request.getId()
        );
    }

    private void sendVariantReviewRejectedNotification(SpiritVariantReviewRequest request, String reason) {
        String message = "요청하신 '" + request.getMasterSpirit().getNameKo() + " "
                + buildEditionLabel(request) + "' 하위 에디션/리뷰 요청이 반려되었습니다."
                + appendReason(reason);
        notificationService.send(
                request.getRequestUser(),
                NotificationType.REQUEST_REJECTED,
                message,
                TARGET_VARIANT_REVIEW_REQUEST,
                request.getId()
        );
    }

    private String buildEditionLabel(SpiritVariantReviewRequest request) {
        return java.util.stream.Stream.of(request.getSeriesIdentifier(), request.getVariantValue())
                .filter(StringUtils::hasText)
                .collect(java.util.stream.Collectors.joining(" "))
                .trim();
    }

    private String appendReason(String reason) {
        return StringUtils.hasText(reason) ? " 사유: " + reason : "";
    }

    private void sendEmailSafely(String to, String subject, String html) {
        if (!StringUtils.hasText(to)) return;
        try {
            emailSender.sendHtml(to, subject, html);
        } catch (Exception e) {
            log.warn("Failed to send variant review moderation email: to={}", to, e);
        }
    }

    private String buildVariantReviewRejectEmail(SpiritVariantReviewRequest request, String reason) {
        String safeReason = reason != null ? escape(reason) : "운영 정책에 따라 승인되지 않았습니다.";
        return """
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
                  <h2>하위 에디션/리뷰 요청 반려 안내</h2>
                  <p>%s에 등록하신 하위 에디션 리뷰 요청이 반려되었습니다.</p>
                  <p><strong>요청 에디션:</strong> %s %s</p>
                  <p><strong>사유:</strong> %s</p>
                  <p>문의가 필요하시면 서비스 문의를 이용해주세요.</p>
                </div>
                """.formatted(
                escape(request.getMasterSpirit().getNameKo()),
                escape(request.getSeriesIdentifier()),
                escape(request.getVariantValue()),
                safeReason
        );
    }

    private String escape(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
