package com.caskbycask.domain.photocard.service;

import com.caskbycask.domain.photocard.dto.PhotoCardDraftResponse;
import com.caskbycask.domain.photocard.dto.PhotoCardDraftSaveRequest;
import com.caskbycask.domain.photocard.entity.PhotoCardDraft;
import com.caskbycask.domain.photocard.repository.PhotoCardDraftRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.util.NoticeImageValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 포토카드 임시저장.
 * <p>
 * ── 왜 사진을 서버에 두는가 ──
 * 배치만 저장하면 다시 열었을 때 사진이 빈 카드가 된다. 이어서 편집하려면 편집 중이던 사진이
 * 그대로 있어야 하고, 그래서 이 기능은 로그인한 사용자만 쓸 수 있다(컨트롤러에서 막는다).
 * <p>
 * ── 왜 기한이 있는가 ──
 * 맡아 두는 것은 남의 사진첩이다. 완성작이 아니라 편집 중인 원본이라 오래 들고 있을 이유가 없고,
 * 사용자도 "임시"라고 알고 맡긴다. {@value #RETENTION_DAYS}일이 지나면
 * {@code PhotoCardDraftCleanupBatch} 가 파일까지 지운다.
 * <p>
 * 사진은 {@link com.caskbycask.global.storage.FileStorageService#upload} 로 그대로 저장한다 —
 * WebP 변환본을 함께 만드는 이미지 업로드 경로는 완성본을 <b>보여 주기</b> 위한 것이고, 여기 사진은
 * 다시 편집기로 들어가 최종 출력의 원본이 된다. 중간에 한 번 더 손실 압축을 끼울 이유가 없다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PhotoCardDraftService {

    /** 사람이 관리할 수 있는 개수 + 사진이 붙는 무게를 함께 본 값. 프론트 안내 문구와 같아야 한다. */
    private static final int MAX_DRAFTS_PER_USER = 5;
    /** 보관 기간(일). 저장할 때마다 여기서부터 다시 센다. */
    public static final int RETENTION_DAYS = 14;
    /** 배치 JSON 상한 — 레이어 24개 + 촬영 정보로 수십 KB 규모다. 그 이상은 정상적인 편집이 아니다. */
    private static final int MAX_CONTENT_LENGTH = 512_000;
    /** 목록 미리보기(data URI) 상한. 300px 안팎의 JPEG 이면 30KB 내외다. */
    private static final int MAX_THUMBNAIL_LENGTH = 300_000;

    private static final DateTimeFormatter MONTH_DIR = DateTimeFormatter.ofPattern("yyyyMM");
    private static final String PHOTO_DIRECTORY = "photo-card-drafts";

    private final PhotoCardDraftRepository draftRepository;
    private final UserRepository userRepository;
    private final NoticeImageValidator imageValidator;
    private final FileStorageService fileStorageService;

    // ═══════════════════════════════════════════
    // 저장 · 조회 · 삭제
    // ═══════════════════════════════════════════

    /**
     * 임시저장(생성/갱신).
     *
     * @param photo 편집 중인 사진. 갱신할 때 생략하면 이전 사진을 그대로 둔다
     *              (배치만 고쳤을 때 같은 사진을 다시 올리지 않게).
     */
    @Transactional
    public PhotoCardDraftResponse save(Long userId, PhotoCardDraftSaveRequest request, MultipartFile photo) {
        validateSize(request);
        LocalDateTime expiresAt = nextExpiry();
        PhotoCardDraft draft = request.id() != null
                ? findMine(userId, request.id())
                : createEmpty(userId);

        draft.update(trimToNull(request.name()), request.content(), request.thumbnail(), expiresAt);

        if (photo != null && !photo.isEmpty()) {
            String previousFile = draft.getPhotoSavedFileName();
            String previousPath = draft.getPhotoSubPath();
            StoredPhoto stored = storePhoto(photo);
            draft.replacePhoto(stored.savedFileName(), stored.subPath(), stored.mimeType());
            deleteFileAfterCommit(previousFile, previousPath);
        }

        // flush 까지 해야 갱신된 updated_at 이 응답에 담긴다 — 저장하자마자 목록의 "언제 저장" 이
        // 이전 시각으로 보이면, 저장이 안 된 것으로 읽힌다.
        return PhotoCardDraftResponse.listItem(draftRepository.saveAndFlush(draft));
    }

    /** 내 임시저장 목록 — 최근에 저장한 것이 위로. */
    @Transactional(readOnly = true)
    public List<PhotoCardDraftResponse> list(Long userId) {
        return draftRepository
                .findByUserIdAndExpiresAtAfterOrderByUpdatedAtDesc(userId, LocalDateTime.now())
                .stream()
                .map(PhotoCardDraftResponse::listItem)
                .toList();
    }

    /** 불러오기 — 배치 JSON 까지 함께 준다. 사진은 별도 요청으로 받아 간다. */
    @Transactional(readOnly = true)
    public PhotoCardDraftResponse get(Long userId, Long id) {
        return PhotoCardDraftResponse.detail(findActive(userId, id));
    }

    /** 사진 파일 — 본인 것만. 공개 URL 을 만들지 않으려고 서비스가 직접 읽어 준다. */
    @Transactional(readOnly = true)
    public PhotoFile getPhoto(Long userId, Long id) {
        PhotoCardDraft draft = findActive(userId, id);
        if (!draft.hasPhoto()) {
            throw new CustomException(ErrorCode.PHOTO_CARD_IMAGE_NOT_FOUND);
        }
        try {
            Resource resource = fileStorageService.loadAsResource(
                    draft.getPhotoSavedFileName(), draft.getPhotoSubPath());
            return new PhotoFile(resource, draft.getPhotoMimeType());
        } catch (CustomException ignored) {
            // 저장소가 파일을 못 찾을 때 나오는 오류는 다른 도메인 문구다. 여기 맥락으로 바꿔 준다.
            throw new CustomException(ErrorCode.PHOTO_CARD_IMAGE_NOT_FOUND);
        }
    }

    @Transactional
    public void delete(Long userId, Long id) {
        PhotoCardDraft draft = findMine(userId, id);
        String fileName = draft.getPhotoSavedFileName();
        String subPath = draft.getPhotoSubPath();
        draftRepository.delete(draft);
        deleteFileAfterCommit(fileName, subPath);
    }

    /** 기한이 지난 임시저장을 사진까지 지운다. @return 지운 개수 */
    @Transactional
    public int cleanupExpired() {
        List<PhotoCardDraft> expired = draftRepository.findAllByExpiresAtLessThanEqual(LocalDateTime.now());
        // 파일부터 지우면 롤백됐을 때 사진 없는 행만 남는다. 행을 지우고, 커밋된 뒤에 파일을 지운다.
        for (PhotoCardDraft draft : expired) {
            deleteFileAfterCommit(draft.getPhotoSavedFileName(), draft.getPhotoSubPath());
        }
        draftRepository.deleteAll(expired);
        return expired.size();
    }

    // ═══════════════════════════════════════════
    // 내부
    // ═══════════════════════════════════════════

    private PhotoCardDraft createEmpty(Long userId) {
        if (draftRepository.countByUserIdAndExpiresAtAfter(userId, LocalDateTime.now())
                >= MAX_DRAFTS_PER_USER) {
            throw new CustomException(ErrorCode.PHOTO_CARD_DRAFT_LIMIT_EXCEEDED);
        }
        User user = userRepository.getByIdOrThrow(userId);
        return PhotoCardDraft.builder()
                .user(user)
                .contentJson("")
                .expiresAt(nextExpiry())
                .build();
    }

    /** 갱신·삭제 대상 — 기한이 지났어도 본인 것이면 찾는다(덮어쓰기와 삭제는 여전히 되어야 한다). */
    private PhotoCardDraft findMine(Long userId, Long id) {
        return draftRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_DRAFT_NOT_FOUND));
    }

    /** 불러오기 대상 — 기한이 지난 것은 없는 셈 친다(배치가 지우기 전이라도 되살리지 않는다). */
    private PhotoCardDraft findActive(Long userId, Long id) {
        PhotoCardDraft draft = findMine(userId, id);
        if (draft.isExpired(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.PHOTO_CARD_DRAFT_NOT_FOUND);
        }
        return draft;
    }

    private void validateSize(PhotoCardDraftSaveRequest request) {
        if (request.content().length() > MAX_CONTENT_LENGTH
                || (request.thumbnail() != null && request.thumbnail().length() > MAX_THUMBNAIL_LENGTH)) {
            throw new CustomException(ErrorCode.PHOTO_CARD_DRAFT_TOO_LARGE);
        }
    }

    /**
     * 사진 저장. 검증(크기·확장자·매직바이트)은 다른 업로드와 같은 것을 쓰고,
     * 저장만 변환 없이 한다.
     */
    private StoredPhoto storePhoto(MultipartFile photo) {
        String mimeType = imageValidator.validate(photo);
        String savedFileName = imageValidator.generateSavedFileName(photo.getOriginalFilename());
        String subPath = PHOTO_DIRECTORY + "/" + YearMonth.now().format(MONTH_DIR);
        fileStorageService.upload(photo, savedFileName, subPath);
        return new StoredPhoto(savedFileName, subPath, mimeType);
    }

    private LocalDateTime nextExpiry() {
        return LocalDateTime.now().plusDays(RETENTION_DAYS);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** 커밋 후에만 물리 파일을 지운다(롤백 시 파일만 사라지는 사고 방지). */
    private void deleteFileAfterCommit(String savedFileName, String subPath) {
        if (savedFileName == null || subPath == null) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deletePhotoQuietly(savedFileName, subPath);
            }
        });
    }

    /** 파일 하나를 못 지웠다고 나머지 정리를 멈추지 않는다. */
    private void deletePhotoQuietly(String savedFileName, String subPath) {
        if (savedFileName == null || subPath == null) return;
        try {
            fileStorageService.delete(savedFileName, subPath);
        } catch (Exception e) {
            log.warn("포토카드 임시저장 사진 삭제 실패: {}/{}", subPath, savedFileName, e);
        }
    }

    private record StoredPhoto(String savedFileName, String subPath, String mimeType) {}

    /** 사진 파일 응답 — 컨트롤러가 그대로 흘려보낸다. */
    public record PhotoFile(Resource resource, String mimeType) {}
}
