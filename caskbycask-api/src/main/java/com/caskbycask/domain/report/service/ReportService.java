package com.caskbycask.domain.report.service;

import com.caskbycask.domain.comment.entity.CommunityComment;
import com.caskbycask.domain.comment.repository.CommentRepository;
import com.caskbycask.domain.report.dto.ReportRequest;
import com.caskbycask.domain.report.dto.ReportResponse;
import com.caskbycask.domain.report.entity.Report;
import com.caskbycask.domain.report.entity.enums.ReportStatus;
import com.caskbycask.domain.report.entity.enums.ReportTargetType;
import com.caskbycask.domain.report.repository.ReportRepository;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.review.service.ReviewService;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.translation.service.TranslationCacheInvalidator;
import com.caskbycask.domain.venue.entity.VenueComment;
import com.caskbycask.domain.venue.repository.VenueCommentRepository;
import com.caskbycask.global.constants.ReportConstants;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final VenueCommentRepository venueCommentRepository;
    private final UserRepository userRepository;
    private final ReviewService reviewService;
    private final TranslationCacheInvalidator translationCacheInvalidator;
    private final HtmlSanitizer htmlSanitizer;

    // ── 신고 생성 ──────────────────────────────────────────

    @Transactional
    public void createReport(Long reporterId, ReportRequest request) {
        validateTargetExists(request.targetType(), request.targetId());

        // [악용 방지] 본인이 작성한 콘텐츠는 신고 불가 — 부계정 등으로 임계치를 채워 자작 콘텐츠를
        //   자동 숨김시키는 어뷰징을 차단. (IMAGE 는 작성자 개념이 모호해 제외)
        validateNotOwnContent(reporterId, request.targetType(), request.targetId());

        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
                reporterId, request.targetType(), request.targetId())) {
            throw new CustomException(ErrorCode.ALREADY_REPORTED);
        }

        User reporter = userRepository.getReferenceById(reporterId);

        Report report = Report.builder()
                .reporter(reporter)
                .targetType(request.targetType())
                .targetId(request.targetId())
                .reason(request.reason())
                .build();

        reportRepository.save(report);
        checkAndHide(request.targetType(), request.targetId());
    }

    // ── 관리자 목록 조회 ───────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ReportResponse> getReports(ReportStatus status, ReportTargetType targetType,
                                           Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        return reportRepository.findWithFilters(status, targetType, sorted)
                .map(report -> ReportResponse.of(report, fetchTargetContent(report)));
    }

    // ── 미처리(PENDING) 신고 수 ─────────────────────────────

    @Transactional(readOnly = true)
    public long countPending() {
        return reportRepository.countByStatus(ReportStatus.PENDING);
    }

    // ── 관리자 처리 ────────────────────────────────────────

    @Transactional
    public void resolveReport(Long reportId) {
        getReport(reportId).resolve();
    }

    @Transactional
    public void dismissReport(Long reportId) {
        Report report = getReport(reportId);
        report.dismiss();
        restoreTarget(report.getTargetType(), report.getTargetId());
    }

    // ── 자동 숨김 ──────────────────────────────────────────

    private void checkAndHide(ReportTargetType targetType, Long targetId) {
        long pendingCount = reportRepository.countByTargetTypeAndTargetIdAndStatus(
                targetType, targetId, ReportStatus.PENDING);

        // [패치 6] 신고 임계치를 대상 유형별 상수로 분리 (술 리뷰·댓글 = 3)
        int threshold = switch (targetType) {
            case REVIEW -> ReportConstants.SPIRIT_REVIEW_HIDE_THRESHOLD;
            case COMMENT -> ReportConstants.SPIRIT_COMMENT_HIDE_THRESHOLD;
            case IMAGE -> ReportConstants.SPIRIT_REVIEW_HIDE_THRESHOLD;
            case VENUE_COMMENT -> ReportConstants.VENUE_COMMENT_HIDE_THRESHOLD;
        };
        if (pendingCount < threshold) return;

        switch (targetType) {
            case REVIEW -> reviewRepository.findById(targetId).ifPresent(review -> {
                if (!review.getIsHidden()) {
                    review.hide();
                    translationCacheInvalidator.invalidateReview(targetId);
                    reviewService.recalculateAvgScore(review.getSpirit().getId());
                }
            });
            case COMMENT -> commentRepository.findById(targetId)
                    .ifPresent(CommunityComment::hide);
            case IMAGE -> spiritImageRepository.findById(targetId)
                    .ifPresent(SpiritImage::unmarkAsPrimary);
            case VENUE_COMMENT -> venueCommentRepository.findById(targetId)
                    .ifPresent(VenueComment::hide);
        }
    }

    // ── 대상 복구 (dismiss) ────────────────────────────────

    private void restoreTarget(ReportTargetType targetType, Long targetId) {
        switch (targetType) {
            case REVIEW -> reviewRepository.findById(targetId).ifPresent(review -> {
                review.unhide();
                translationCacheInvalidator.invalidateReview(targetId);
                reviewService.recalculateAvgScore(review.getSpirit().getId());
            });
            case COMMENT -> commentRepository.findById(targetId)
                    .ifPresent(CommunityComment::unhide);
            case IMAGE -> {
                // 이미지는 관리자가 별도로 대표 이미지 설정 — 자동 복구 없음
            }
            case VENUE_COMMENT -> venueCommentRepository.findById(targetId)
                    .ifPresent(VenueComment::unhide);
        }
    }

    // ── Private helpers ────────────────────────────────────

    private void validateNotOwnContent(Long reporterId, ReportTargetType targetType, Long targetId) {
        Long authorId = switch (targetType) {
            case REVIEW -> reviewRepository.findById(targetId)
                    .map(r -> r.getUser().getId()).orElse(null);
            case COMMENT -> commentRepository.findById(targetId)
                    .map(c -> c.getUser().getId()).orElse(null);
            case IMAGE -> null; // 작성자 개념 없음 — 자가신고 검사 제외
            case VENUE_COMMENT -> venueCommentRepository.findById(targetId)
                    .map(c -> c.getUser().getId()).orElse(null);
        };
        if (authorId != null && authorId.equals(reporterId)) {
            throw new CustomException(ErrorCode.CANNOT_REPORT_OWN_CONTENT);
        }
    }

    private void validateTargetExists(ReportTargetType targetType, Long targetId) {
        boolean exists = switch (targetType) {
            case REVIEW -> reviewRepository.existsById(targetId);
            case COMMENT -> commentRepository.existsById(targetId);
            case IMAGE -> spiritImageRepository.existsById(targetId);
            case VENUE_COMMENT -> venueCommentRepository.existsById(targetId);
        };
        if (!exists) {
            throw new CustomException(ErrorCode.TARGET_NOT_FOUND);
        }
    }

    private String fetchTargetContent(Report report) {
        return switch (report.getTargetType()) {
            case REVIEW -> reviewRepository.findById(report.getTargetId())
                    // 종합평가는 서식 있는 HTML 이다 — 신고 처리 화면·메일은 본문만 보여 준다.
                    .map(r -> r.getComment() != null
                            ? htmlSanitizer.sanitizeToPlainText(r.getComment())
                            : "(점수만 작성된 리뷰)")
                    .orElse("[삭제된 리뷰]");
            case COMMENT -> commentRepository.findById(report.getTargetId())
                    .map(CommunityComment::getContent)
                    .orElse("[삭제된 댓글]");
            case IMAGE -> spiritImageRepository.findById(report.getTargetId())
                    .map(SpiritImage::getImageUrl)
                    .orElse("[삭제된 이미지]");
            case VENUE_COMMENT -> venueCommentRepository.findById(report.getTargetId())
                    .map(VenueComment::getContent)
                    .orElse("[삭제된 장소 댓글]");
        };
    }

    private Report getReport(Long reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new CustomException(ErrorCode.REPORT_NOT_FOUND));
    }
}
