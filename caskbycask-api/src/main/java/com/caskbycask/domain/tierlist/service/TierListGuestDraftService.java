package com.caskbycask.domain.tierlist.service;

import com.caskbycask.domain.tierlist.dto.*;
import com.caskbycask.domain.tierlist.entity.*;
import com.caskbycask.domain.tierlist.repository.*;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TierListGuestDraftService {

    public static final String TOKEN_HEADER = "X-Tier-List-Draft-Token";
    private static final int EXPIRY_MINUTES = 30;
    private static final int MAX_ROWS = 12;
    private static final int MAX_ITEMS = 200;
    private static final int MAX_IMAGES = 20;
    private static final int TOKEN_BYTES = 32;

    private final TierListGuestDraftRepository draftRepository;
    private final TierListGuestDraftImageRepository draftImageRepository;
    private final TierListImageRepository tierListImageRepository;
    private final UserRepository userRepository;
    private final ValidatedImageUploader validatedImageUploader;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final Random random = new java.security.SecureRandom();

    @Transactional
    public TierListGuestDraftResponse create(TierListGuestDraftRequest request) {
        validate(request);
        String token = generateToken();
        LocalDateTime expiresAt = nextExpiry();
        TierListGuestDraft draft = TierListGuestDraft.builder()
                .tokenHash(hashToken(token))
                .contentJson(toJson(request))
                .expiresAt(expiresAt)
                .build();
        draftRepository.save(draft);
        return new TierListGuestDraftResponse(token, expiresAt, request);
    }

    @Transactional
    public TierListGuestDraftResponse update(String token, TierListGuestDraftRequest request) {
        validate(request);
        TierListGuestDraft draft = requireActive(token);
        LocalDateTime expiresAt = nextExpiry();
        draft.update(toJson(request), expiresAt);
        return new TierListGuestDraftResponse(token, expiresAt, request);
    }

    @Transactional
    public TierListGuestDraftResponse get(String token) {
        TierListGuestDraft draft = requireActive(token);
        return response(token, draft);
    }

    @Transactional
    public TierListGuestDraftResponse claim(String token, Long userId) {
        TierListGuestDraft draft = requireActive(token);
        User user = userRepository.getByIdOrThrow(userId);
        List<TierListGuestDraftImage> images = draftImageRepository.findAllByDraftId(draft.getId());
        for (TierListGuestDraftImage image : images) {
            tierListImageRepository.save(TierListImage.builder()
                    .uploadedBy(user)
                    .originalFileName(image.getOriginalFileName())
                    .savedFileName(image.getSavedFileName())
                    .fileSize(image.getFileSize())
                    .mimeType(image.getMimeType())
                    .imageUrl(image.getImageUrl())
                    .subPath(image.getSubPath())
                    .build());
        }
        TierListGuestDraftResponse response = response(null, draft);
        draftRepository.delete(draft);
        return response;
    }

    @Transactional
    public TierListImageUploadResponse uploadImage(String token, MultipartFile file) {
        TierListGuestDraft draft = requireActive(token);
        if (draftImageRepository.countByDraftId(draft.getId()) >= MAX_IMAGES) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        ValidatedImageUploader.StoredImage stored = validatedImageUploader.upload(file, "tier-list");
        TierListGuestDraftImage image = TierListGuestDraftImage.builder()
                .draft(draft)
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .subPath(stored.subPath())
                .build();
        draft.extend(nextExpiry());
        TierListGuestDraftImage saved = draftImageRepository.save(image);
        return new TierListImageUploadResponse(saved.getId(), saved.getImageUrl(), saved.getSavedFileName(), saved.getMimeType());
    }

    @Transactional
    public Optional<TierListImageFile> findActiveImage(String savedFileName) {
        Optional<TierListGuestDraftImage> found = draftImageRepository.findBySavedFileName(savedFileName);
        if (found.isEmpty()) return Optional.empty();
        TierListGuestDraftImage image = found.get();
        if (image.getDraft().isExpired(LocalDateTime.now())) {
            deleteDraftWithFiles(image.getDraft());
            return Optional.empty();
        }
        return Optional.of(new TierListImageFile(image.getSavedFileName(), image.getSubPath(), image.getMimeType()));
    }

    @Transactional
    public int cleanupExpired() {
        List<TierListGuestDraft> expired = draftRepository.findAllByExpiresAtLessThanEqual(LocalDateTime.now());
        expired.forEach(this::deleteDraftWithFiles);
        return expired.size();
    }

    private TierListGuestDraft requireActive(String token) {
        if (token == null || token.isBlank()) {
            throw new CustomException(ErrorCode.TIER_LIST_DRAFT_NOT_FOUND);
        }
        TierListGuestDraft draft = draftRepository.findByTokenHash(hashToken(token.trim()))
                .orElseThrow(() -> new CustomException(ErrorCode.TIER_LIST_DRAFT_NOT_FOUND));
        if (draft.isExpired(LocalDateTime.now())) {
            deleteDraftWithFiles(draft);
            throw new CustomException(ErrorCode.TIER_LIST_DRAFT_EXPIRED);
        }
        return draft;
    }

    private void deleteDraftWithFiles(TierListGuestDraft draft) {
        for (TierListGuestDraftImage image : draftImageRepository.findAllByDraftId(draft.getId())) {
            try {
                fileStorageService.delete(image.getSavedFileName(), image.getSubPath());
            } catch (Exception e) {
                log.warn("Failed to delete expired guest tier-list image: {}", image.getSavedFileName(), e);
            }
        }
        draftRepository.delete(draft);
    }

    private TierListGuestDraftResponse response(String token, TierListGuestDraft draft) {
        try {
            return new TierListGuestDraftResponse(token, draft.getExpiresAt(),
                    objectMapper.readValue(draft.getContentJson(), TierListGuestDraftRequest.class));
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize guest tier-list draft {}", draft.getId(), e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private String toJson(TierListGuestDraftRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private void validate(TierListGuestDraftRequest request) {
        if (request.rows() == null || request.rows().isEmpty() || request.rows().size() > MAX_ROWS) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (request.items() != null && request.items().size() > MAX_ITEMS) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private LocalDateTime nextExpiry() {
        return LocalDateTime.now().plusMinutes(EXPIRY_MINUTES);
    }

    private String generateToken() {
        String token;
        do {
            byte[] bytes = new byte[TOKEN_BYTES];
            random.nextBytes(bytes);
            token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } while (draftRepository.existsByTokenHash(hashToken(token)));
        return token;
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
