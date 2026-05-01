package com.drinkindex.domain.report.service;

import com.drinkindex.domain.comment.entity.CommunityComment;
import com.drinkindex.domain.comment.repository.CommentRepository;
import com.drinkindex.domain.report.dto.ReportRequest;
import com.drinkindex.domain.report.dto.ReportResponse;
import com.drinkindex.domain.report.entity.Report;
import com.drinkindex.domain.report.entity.enums.ReportStatus;
import com.drinkindex.domain.report.entity.enums.ReportTargetType;
import com.drinkindex.domain.report.repository.ReportRepository;
import com.drinkindex.domain.review.entity.Review;
import com.drinkindex.domain.review.repository.ReviewRepository;
import com.drinkindex.domain.review.service.ReviewService;
import com.drinkindex.domain.spirit.entity.SpiritImage;
import com.drinkindex.domain.spirit.repository.SpiritImageRepository;
import com.drinkindex.domain.user.entity.User;
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

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final int AUTO_HIDE_THRESHOLD = 3;

    private final ReportRepository reportRepository;
    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final UserRepository userRepository;
    private final ReviewService reviewService;

    // ── 신고 생성 ──────────────────────────────────────────

    @Transactional
    public void createReport(Long reporterId, ReportRequest request) {
        validateTargetExists(request.targetType(), request.targetId());

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

        if (pendingCount < AUTO_HIDE_THRESHOLD) return;

        switch (targetType) {
            case REVIEW -> reviewRepository.findById(targetId).ifPresent(review -> {
                if (!review.getIsHidden()) {
                    review.hide();
                    reviewService.recalculateAvgScore(review.getSpirit().getId());
                }
            });
            case COMMENT -> commentRepository.findById(targetId)
                    .ifPresent(CommunityComment::hide);
            case IMAGE -> spiritImageRepository.findById(targetId)
                    .ifPresent(SpiritImage::unmarkAsPrimary);
        }
    }

    // ── 대상 복구 (dismiss) ────────────────────────────────

    private void restoreTarget(ReportTargetType targetType, Long targetId) {
        switch (targetType) {
            case REVIEW -> reviewRepository.findById(targetId).ifPresent(review -> {
                review.unhide();
                reviewService.recalculateAvgScore(review.getSpirit().getId());
            });
            case COMMENT -> commentRepository.findById(targetId)
                    .ifPresent(CommunityComment::unhide);
            case IMAGE -> {
                // 이미지는 관리자가 별도로 대표 이미지 설정 — 자동 복구 없음
            }
        }
    }

    // ── Private helpers ────────────────────────────────────

    private void validateTargetExists(ReportTargetType targetType, Long targetId) {
        boolean exists = switch (targetType) {
            case REVIEW -> reviewRepository.existsById(targetId);
            case COMMENT -> commentRepository.existsById(targetId);
            case IMAGE -> spiritImageRepository.existsById(targetId);
        };
        if (!exists) {
            throw new CustomException(ErrorCode.TARGET_NOT_FOUND);
        }
    }

    private String fetchTargetContent(Report report) {
        return switch (report.getTargetType()) {
            case REVIEW -> reviewRepository.findById(report.getTargetId())
                    .map(r -> r.getComment() != null ? r.getComment() : "(점수만 작성된 리뷰)")
                    .orElse("[삭제된 리뷰]");
            case COMMENT -> commentRepository.findById(report.getTargetId())
                    .map(CommunityComment::getContent)
                    .orElse("[삭제된 댓글]");
            case IMAGE -> spiritImageRepository.findById(report.getTargetId())
                    .map(SpiritImage::getImageUrl)
                    .orElse("[삭제된 이미지]");
        };
    }

    private Report getReport(Long reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new CustomException(ErrorCode.REPORT_NOT_FOUND));
    }
}
