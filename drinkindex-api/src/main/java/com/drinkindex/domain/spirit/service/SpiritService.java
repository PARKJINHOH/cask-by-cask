package com.drinkindex.domain.spirit.service;

import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.distillery.repository.DistilleryRepository;
import com.drinkindex.domain.spirit.dto.*;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.SpiritImage;
import com.drinkindex.domain.spirit.entity.SpiritRegisterRequest;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritImageRepository;
import com.drinkindex.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpiritService {

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final SpiritRegisterRequestRepository registerRequestRepository;
    private final DistilleryRepository distilleryRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // ── 공개 조회 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<SpiritListResponse> searchSpirits(SpiritSearchCondition condition,
                                                   Pageable pageable) {
        return spiritRepository.search(condition, pageable);
    }

    @Transactional(readOnly = true)
    public SpiritDetailResponse getSpiritDetail(Long id) {
        Spirit spirit = spiritRepository.findByIdAndStatus(id, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        List<SpiritImageResponse> images = spiritImageRepository.findBySpiritId(id)
                .stream()
                .map(SpiritImageResponse::from)
                .toList();

        return SpiritDetailResponse.of(spirit, images);
    }

    // ── 관리자 CRUD ─────────────────────────────────────────

    @Transactional
    public SpiritDetailResponse createSpirit(CreateSpiritRequest request, Long userId) {
        User registeredBy = getUser(userId);
        Distillery distillery = resolveDistillery(request.distilleryId());

        verifyDistilleryAccess(registeredBy, distillery);

        Spirit spirit = Spirit.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .category(request.category())
                .distillery(distillery)
                .bottler(request.bottler())
                .bottledYear(request.bottledYear())
                .vintageYear(request.vintageYear())
                .abv(request.abv())
                .volumeMl(request.volumeMl())
                .country(request.country())
                .region(request.region())
                .status(SpiritStatus.ACTIVE)
                .registeredBy(registeredBy)
                .build();

        return SpiritDetailResponse.of(spiritRepository.save(spirit), List.of());
    }

    @Transactional
    public SpiritDetailResponse updateSpirit(Long id, UpdateSpiritRequest request, Long userId) {
        Spirit spirit = getSpirit(id);
        User user = getUser(userId);

        verifyDistilleryAccess(user, spirit.getDistillery());

        Distillery distillery = request.distilleryId() != null
                ? resolveDistillery(request.distilleryId())
                : spirit.getDistillery();

        spirit.update(
                request.nameKo() != null ? request.nameKo() : spirit.getNameKo(),
                request.nameEn() != null ? request.nameEn() : spirit.getNameEn(),
                request.category() != null ? request.category() : spirit.getCategory(),
                distillery,
                request.bottler() != null ? request.bottler() : spirit.getBottler(),
                request.bottledYear() != null ? request.bottledYear() : spirit.getBottledYear(),
                request.vintageYear() != null ? request.vintageYear() : spirit.getVintageYear(),
                request.abv() != null ? request.abv() : spirit.getAbv(),
                request.volumeMl() != null ? request.volumeMl() : spirit.getVolumeMl(),
                request.country() != null ? request.country() : spirit.getCountry(),
                request.region() != null ? request.region() : spirit.getRegion()
        );

        List<SpiritImageResponse> images = spiritImageRepository.findBySpiritId(id)
                .stream().map(SpiritImageResponse::from).toList();

        return SpiritDetailResponse.of(spirit, images);
    }

    @Transactional
    public void deleteSpirit(Long id) {
        Spirit spirit = getSpirit(id);
        spirit.hide();
    }

    // ── 사용자 등록 요청 ────────────────────────────────────

    @Transactional
    public SpiritRegisterRequestResponse submitRegisterRequest(
            SpiritRegisterRequestBody body, Long userId) {
        User user = getUser(userId);

        String spiritData;
        try {
            spiritData = objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        SpiritRegisterRequest request = SpiritRegisterRequest.builder()
                .user(user)
                .spiritData(spiritData)
                .build();

        SpiritRegisterRequest saved = registerRequestRepository.save(request);
        return toRegisterResponse(saved, body.nameKo(), body.nameEn(), body.category());
    }

    @Transactional(readOnly = true)
    public List<SpiritRegisterRequestResponse> getMyRegisterRequests(Long userId) {
        return registerRequestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::parseRegisterResponse)
                .toList();
    }

    // ── 관리자 — 등록 요청 처리 ─────────────────────────────

    @Transactional(readOnly = true)
    public Page<SpiritRegisterRequestResponse> getRegisterRequests(
            RequestStatus status, Pageable pageable) {
        return registerRequestRepository.findByStatus(status, pageable)
                .map(this::parseRegisterResponse);
    }

    @Transactional
    public SpiritDetailResponse approveRegisterRequest(Long requestId, Long adminId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        User admin = getUser(adminId);

        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        Distillery distillery = resolveDistillery(body.distilleryId());

        Spirit spirit = Spirit.builder()
                .nameKo(body.nameKo())
                .nameEn(body.nameEn())
                .category(body.category())
                .distillery(distillery)
                .bottler(body.bottler())
                .bottledYear(body.bottledYear())
                .vintageYear(body.vintageYear())
                .abv(body.abv())
                .volumeMl(body.volumeMl())
                .country(body.country())
                .region(body.region())
                .status(SpiritStatus.ACTIVE)
                .registeredBy(req.getUser())
                .build();

        Spirit saved = spiritRepository.save(spirit);

        List<SpiritImage> images = List.of();
        if (body.imageUrls() != null) {
            images = body.imageUrls().stream()
                    .map(url -> SpiritImage.builder()
                            .spirit(saved)
                            .imageUrl(url)
                            .isPrimary(false)
                            .sortOrder(0)
                            .build())
                    .toList();
            if (!images.isEmpty()) {
                images.get(0).markAsPrimary();
            }
            spiritImageRepository.saveAll(images);
        }

        req.approve(admin);

        return SpiritDetailResponse.of(saved,
                images.stream().map(SpiritImageResponse::from).toList());
    }

    @Transactional
    public void rejectRegisterRequest(Long requestId, String rejectReason, Long adminId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        User admin = getUser(adminId);
        req.reject(admin, rejectReason);
    }

    // ── Private helpers ─────────────────────────────────────

    private Spirit getSpirit(Long id) {
        return spiritRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private SpiritRegisterRequest getRegisterRequest(Long id) {
        return registerRequestRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_REQUEST_NOT_FOUND));
    }

    private Distillery resolveDistillery(Long distilleryId) {
        if (distilleryId == null) return null;
        return distilleryRepository.findById(distilleryId)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
    }

    private void verifyDistilleryAccess(User user, Distillery distillery) {
        if (user.getRole() != Role.DISTILLERY) return;
        if (distillery == null
                || user.getDistillery() == null
                || !user.getDistillery().getId().equals(distillery.getId())) {
            throw new CustomException(ErrorCode.SPIRIT_ACCESS_DENIED);
        }
    }

    private SpiritRegisterRequestBody parseSpiritData(String spiritData) {
        try {
            return objectMapper.readValue(spiritData, SpiritRegisterRequestBody.class);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private SpiritRegisterRequestResponse parseRegisterResponse(SpiritRegisterRequest req) {
        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        return toRegisterResponse(req, body.nameKo(), body.nameEn(), body.category());
    }

    private SpiritRegisterRequestResponse toRegisterResponse(
            SpiritRegisterRequest req, String nameKo, String nameEn, SpiritCategory category) {
        return new SpiritRegisterRequestResponse(
                req.getId(),
                nameKo,
                nameEn,
                category,
                req.getStatus(),
                req.getRejectReason(),
                req.getCreatedAt(),
                req.getReviewedAt()
        );
    }
}
