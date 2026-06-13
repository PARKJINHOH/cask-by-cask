package com.caskbycask.domain.feedback.service;

import com.caskbycask.domain.feedback.dto.*;
import com.caskbycask.domain.feedback.entity.Feedback;
import com.caskbycask.domain.feedback.entity.FeedbackComment;
import com.caskbycask.domain.feedback.entity.enums.FeedbackStatus;
import com.caskbycask.domain.feedback.repository.FeedbackCommentRepository;
import com.caskbycask.domain.feedback.repository.FeedbackRepository;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ImageUploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final FeedbackCommentRepository feedbackCommentRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ScoreService scoreService;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final long MAX_FILE_SIZE = 2 * 1024 * 1024L;
    private static final long MAX_TOTAL_SIZE = 6 * 1024 * 1024L;
    private static final int MAX_FILE_COUNT = 3;
    private static final int PAGE_SIZE = 20;

    // ─── 작성 ───────────────────────────────────

    @Transactional
    public Long create(Long userId, FeedbackCreateRequest request, List<MultipartFile> images) {
        User author = userRepository.getByIdOrThrow(userId);

        String imageUrlsStr = uploadImages(images);

        Feedback feedback = Feedback.builder()
                .author(author)
                .type(request.type())
                .title(request.title())
                .content(request.content())
                .imageUrls(imageUrlsStr)
                .isPublic(request.isPublic() == null || request.isPublic())
                .build();

        Long id = feedbackRepository.save(feedback).getId();
        scoreService.award(userId, ScoreActions.FEEDBACK_WRITE, "FEEDBACK", id);
        return id;
    }

    // ─── 목록 ───────────────────────────────────

    @Transactional(readOnly = true)
    public Page<FeedbackListResponse> list(Long userId, Role role, FeedbackStatus status, boolean mine, int page) {
        boolean isAdmin = isAdmin(role);
        Pageable pageable = PageRequest.of(page, PAGE_SIZE, Sort.by("createdAt").descending());

        Page<Feedback> result;
        if (isAdmin && !mine) {
            result = (status != null)
                    ? feedbackRepository.findByStatus(status, pageable)
                    : feedbackRepository.findAll(pageable);
        } else if (mine) {
            result = (status != null)
                    ? feedbackRepository.findByAuthorIdAndStatus(userId, status, pageable)
                    : feedbackRepository.findByAuthorId(userId, pageable);
        } else {
            result = (status != null)
                    ? feedbackRepository.findVisibleByStatus(userId, status, pageable)
                    : feedbackRepository.findVisible(userId, pageable);
        }
        return result.map(f -> FeedbackListResponse.from(f, isAdmin));
    }

    // ─── 상세 ───────────────────────────────────

    @Transactional(readOnly = true)
    public FeedbackDetailResponse detail(Long userId, Role role, Long id) {
        boolean isAdmin = isAdmin(role);
        Feedback feedback = findVisible(id, userId, isAdmin);
        List<FeedbackComment> comments = feedbackCommentRepository.findByFeedbackIdOrderByCreatedAtAsc(id);
        return FeedbackDetailResponse.from(feedback, comments, userId, isAdmin);
    }

    // ─── 수정 (작성자 본인, 접수 상태에서만) ───────

    @Transactional
    public void update(Long userId, Long id, FeedbackUpdateRequest request) {
        Feedback feedback = findById(id);
        if (!feedback.isOwnedBy(userId)) {
            throw new CustomException(ErrorCode.FEEDBACK_FORBIDDEN);
        }
        if (!feedback.isEditable()) {
            throw new CustomException(ErrorCode.FEEDBACK_NOT_EDITABLE);
        }
        feedback.updateContent(request.type(), request.title(), request.content(), request.isPublic());
    }

    // ─── 삭제 (작성자 본인, 접수 상태에서만) ───────

    @Transactional
    public void delete(Long userId, Long id) {
        Feedback feedback = findById(id);
        if (!feedback.isOwnedBy(userId)) {
            throw new CustomException(ErrorCode.FEEDBACK_FORBIDDEN);
        }
        if (!feedback.isEditable()) {
            throw new CustomException(ErrorCode.FEEDBACK_NOT_EDITABLE);
        }
        // 댓글은 FK on delete 가 아닌 애플리케이션에서 선삭제
        feedbackCommentRepository.deleteAll(
                feedbackCommentRepository.findByFeedbackIdOrderByCreatedAtAsc(id));
        feedbackRepository.delete(feedback);
    }

    // ─── 관리자: 상태/진척률 변경 ─────────────────

    @Transactional
    public void changeStatus(Role role, Long id, UpdateFeedbackStatusRequest request) {
        requireAdmin(role);
        Feedback feedback = findById(id);
        boolean wasResolved = feedback.getStatus() == FeedbackStatus.RESOLVED;
        feedback.changeStatus(request.status(), request.progress());
        if (request.status() == FeedbackStatus.RESOLVED && !wasResolved) {
            scoreService.award(feedback.getAuthor().getId(), ScoreActions.FEEDBACK_RESOLVED, "FEEDBACK", id);
        }
    }

    // ─── 댓글 (작성자 또는 관리자) ─────────────────

    @Transactional
    public void addComment(Long userId, Role role, Long id, FeedbackCommentRequest request) {
        boolean isAdmin = isAdmin(role);
        Feedback feedback = findAccessible(id, userId, isAdmin);
        User author = userRepository.getByIdOrThrow(userId);

        FeedbackComment comment = FeedbackComment.builder()
                .feedback(feedback)
                .author(author)
                .isAdminReply(isAdmin)
                .content(request.content())
                .build();
        feedbackCommentRepository.save(comment);
        feedback.incrementCommentCount();
    }

    // ─── 내부 헬퍼 ───────────────────────────────

    private boolean isAdmin(Role role) {
        return role == Role.SUPER_ADMIN || role == Role.ADMIN;
    }

    private void requireAdmin(Role role) {
        if (!isAdmin(role)) {
            throw new CustomException(ErrorCode.FEEDBACK_FORBIDDEN);
        }
    }

    private Feedback findById(Long id) {
        return feedbackRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    /** 작성자 본인 또는 관리자만 접근 허용. 그 외 FORBIDDEN. (댓글 작성 등) */
    private Feedback findAccessible(Long id, Long userId, boolean isAdmin) {
        Feedback feedback = findById(id);
        if (!isAdmin && !feedback.isOwnedBy(userId)) {
            throw new CustomException(ErrorCode.FEEDBACK_FORBIDDEN);
        }
        return feedback;
    }

    /** 작성자 본인·관리자 또는 공개글이면 접근 허용. 그 외 FORBIDDEN. (상세 조회) */
    private Feedback findVisible(Long id, Long userId, boolean isAdmin) {
        Feedback feedback = findById(id);
        if (!feedback.isVisibleTo(userId, isAdmin)) {
            throw new CustomException(ErrorCode.FEEDBACK_FORBIDDEN);
        }
        return feedback;
    }

    private String uploadImages(List<MultipartFile> images) {
        List<MultipartFile> valid = (images == null) ? List.of() :
                images.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (valid.isEmpty()) {
            return null;
        }
        validateImages(valid);

        String subPath = "feedbacks/" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        List<String> urls = new ArrayList<>();
        for (MultipartFile image : valid) {
            String ext = getExtension(image.getOriginalFilename());
            String savedName = UUID.randomUUID() + "." + ext;
            try {
                String mime = image.getContentType() != null
                        ? image.getContentType().toLowerCase() : extToMime(ext);
                ImageUploadResult result = fileStorageService.uploadImage(image, savedName, subPath, mime);
                urls.add(result.imageUrl());
            } catch (Exception e) {
                log.error("개선·문의 이미지 업로드 실패", e);
                throw new CustomException(ErrorCode.STORAGE_ERROR);
            }
        }
        return String.join(",", urls);
    }

    private void validateImages(List<MultipartFile> images) {
        if (images.size() > MAX_FILE_COUNT) {
            throw new CustomException(ErrorCode.FEEDBACK_TOO_MANY_IMAGES);
        }
        long totalSize = 0;
        for (MultipartFile image : images) {
            if (image.getSize() > MAX_FILE_SIZE) {
                throw new CustomException(ErrorCode.FEEDBACK_IMAGE_SIZE_EXCEEDED);
            }
            totalSize += image.getSize();
            String ext = getExtension(image.getOriginalFilename());
            if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
                throw new CustomException(ErrorCode.FEEDBACK_INVALID_IMAGE_FORMAT);
            }
        }
        if (totalSize > MAX_TOTAL_SIZE) {
            throw new CustomException(ErrorCode.FEEDBACK_TOTAL_IMAGE_SIZE_EXCEEDED);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private String extToMime(String ext) {
        return switch (ext) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            default -> "application/octet-stream";
        };
    }
}
