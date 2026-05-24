package com.drinkindex.domain.distillery.service;

import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.service.NotificationService;
import com.drinkindex.domain.distillery.dto.*;
import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.distillery.entity.DistilleryRegisterRequest;
import com.drinkindex.domain.distillery.repository.DistilleryRegisterRequestRepository;
import com.drinkindex.domain.distillery.repository.DistilleryRepository;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.user.entity.User;
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
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DistilleryService {

    private final DistilleryRepository distilleryRepository;
    private final DistilleryRegisterRequestRepository distilleryRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    // ── 공개 조회 ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DistilleryResponse> search(String keyword, String country, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String countryParam = StringUtils.hasText(country) ? country.trim() : null;
        return distilleryRepository.search(keywordParam, countryParam, pageable)
                .map(DistilleryResponse::from);
    }

    @Transactional(readOnly = true)
    public DistilleryResponse findById(Long id) {
        return DistilleryResponse.from(getDistillery(id));
    }

    // ── 관리자 CRUD ─────────────────────────────────────────────

    @Transactional
    public DistilleryResponse create(CreateDistilleryRequest request) {
        Distillery distillery = Distillery.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .country(request.country())
                .region(request.region())
                .website(request.website())
                .foundedYear(request.foundedYear())
                .descriptionKo(request.descriptionKo())
                .descriptionEn(request.descriptionEn())
                .build();
        return DistilleryResponse.from(distilleryRepository.save(distillery));
    }

    @Transactional
    public DistilleryResponse update(Long id, UpdateDistilleryRequest request) {
        Distillery distillery = getDistillery(id);
        distillery.update(
                request.nameKo()        != null ? request.nameKo()        : distillery.getNameKo(),
                request.nameEn()        != null ? request.nameEn()        : distillery.getNameEn(),
                request.country()       != null ? request.country()       : distillery.getCountry(),
                request.region()        != null ? request.region()        : distillery.getRegion(),
                request.website()       != null ? request.website()       : distillery.getWebsite(),
                request.foundedYear()   != null ? request.foundedYear()   : distillery.getFoundedYear(),
                request.descriptionKo() != null ? request.descriptionKo() : distillery.getDescriptionKo(),
                request.descriptionEn() != null ? request.descriptionEn() : distillery.getDescriptionEn()
        );
        return DistilleryResponse.from(distillery);
    }

    @Transactional
    public void delete(Long id) {
        Distillery distillery = getDistillery(id);
        distilleryRepository.delete(distillery);
    }

    // ── 사용자 등록 요청 ─────────────────────────────────────────

    @Transactional
    public DistilleryRegisterRequestResponse submitDistilleryRequest(
            DistilleryRegisterRequestBody body, Long userId) {
        User user = getUser(userId);
        String data = serialize(body);

        DistilleryRegisterRequest req = DistilleryRegisterRequest.builder()
                .user(user)
                .distilleryData(data)
                .build();

        DistilleryRegisterRequest saved = distilleryRequestRepository.save(req);
        return toResponse(saved, body);
    }

    @Transactional(readOnly = true)
    public List<DistilleryRegisterRequestResponse> getMyDistilleryRequests(Long userId) {
        return distilleryRequestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(req -> toResponse(req, parseData(req.getDistilleryData())))
                .toList();
    }

    // ── 관리자 — 등록 요청 처리 ──────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DistilleryRegisterRequestResponse> getDistilleryRequests(
            RequestStatus status, Pageable pageable) {
        return distilleryRequestRepository.findByStatus(status, pageable)
                .map(req -> toResponse(req, parseData(req.getDistilleryData())));
    }

    @Transactional
    public DistilleryResponse approveDistilleryRequest(Long requestId, Long adminId) {
        DistilleryRegisterRequest req = getDistilleryRequest(requestId);
        User admin = getUser(adminId);
        DistilleryRegisterRequestBody body = parseData(req.getDistilleryData());

        Distillery distillery = Distillery.builder()
                .nameKo(body.nameKo())
                .nameEn(body.nameEn())
                .country(body.country())
                .region(body.region())
                .build();

        Distillery saved = distilleryRepository.save(distillery);
        req.approve(admin);

        notificationService.send(
                req.getUser(),
                NotificationType.REQUEST_APPROVED,
                "증류소 등록 요청 '" + body.nameKo() + "'이(가) 승인되었습니다.",
                "DISTILLERY_REQUEST",
                requestId
        );

        return DistilleryResponse.from(saved);
    }

    @Transactional
    public void rejectDistilleryRequest(Long requestId, String rejectReason, Long adminId) {
        DistilleryRegisterRequest req = getDistilleryRequest(requestId);
        User admin = getUser(adminId);
        DistilleryRegisterRequestBody body = parseData(req.getDistilleryData());
        req.reject(admin, rejectReason);

        notificationService.send(
                req.getUser(),
                NotificationType.REQUEST_REJECTED,
                "증류소 등록 요청 '" + body.nameKo() + "'이(가) 반려되었습니다.",
                "DISTILLERY_REQUEST",
                requestId
        );
    }

    // ── Private helpers ──────────────────────────────────────────

    private Distillery getDistillery(Long id) {
        return distilleryRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private DistilleryRegisterRequest getDistilleryRequest(Long id) {
        return distilleryRequestRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_REQUEST_NOT_FOUND));
    }

    private DistilleryRegisterRequestBody parseData(String json) {
        try {
            return objectMapper.readValue(json, DistilleryRegisterRequestBody.class);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String serialize(DistilleryRegisterRequestBody body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private DistilleryRegisterRequestResponse toResponse(
            DistilleryRegisterRequest req, DistilleryRegisterRequestBody body) {
        return new DistilleryRegisterRequestResponse(
                req.getId(),
                body.nameKo(),
                body.nameEn(),
                body.country(),
                req.getStatus(),
                req.getRejectReason(),
                req.getCreatedAt(),
                req.getReviewedAt()
        );
    }
}
