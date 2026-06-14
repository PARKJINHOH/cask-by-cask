package com.caskbycask.domain.producer.service;

import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.producer.dto.*;
import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;
import com.caskbycask.domain.producer.entity.ProducerRegisterRequest;
import com.caskbycask.domain.producer.repository.ProducerRegisterRequestRepository;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
public class ProducerService {

    private final ProducerRepository producerRepository;
    private final ProducerRegisterRequestRepository producerRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    // ── 공개 조회 ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ProducerResponse> search(
            String keyword, String nameKo, String nameEn, String country, Integer foundedYear,
            ProducerType type, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String nameKoParam = StringUtils.hasText(nameKo) ? nameKo.trim() : null;
        String nameEnParam = StringUtils.hasText(nameEn) ? nameEn.trim() : null;
        String countryParam = StringUtils.hasText(country) ? country.trim() : null;
        return producerRepository.search(keywordParam, nameKoParam, nameEnParam, countryParam, foundedYear, type, pageable)
                .map(ProducerResponse::from);
    }

    @Transactional(readOnly = true)
    public ProducerResponse findById(Long id) {
        return ProducerResponse.from(getProducer(id));
    }

    // ── 관리자 CRUD ─────────────────────────────────────────────

    @Transactional
    public ProducerResponse create(CreateProducerRequest request) {
        Producer producer = Producer.builder()
                .type(request.type() != null ? request.type() : ProducerType.DISTILLERY)
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .country(request.country())
                .region(request.region())
                .website(request.website())
                .foundedYear(request.foundedYear())
                .descriptionKo(request.descriptionKo())
                .descriptionEn(request.descriptionEn())
                .searchKeywords(request.searchKeywords())
                .build();
        return ProducerResponse.from(producerRepository.save(producer));
    }

    @Transactional
    public ProducerResponse update(Long id, UpdateProducerRequest request) {
        Producer producer = getProducer(id);
        producer.update(
                request.type()          != null ? request.type()          : producer.getType(),
                request.nameKo()        != null ? request.nameKo()        : producer.getNameKo(),
                request.nameEn()        != null ? request.nameEn()        : producer.getNameEn(),
                request.country()       != null ? request.country()       : producer.getCountry(),
                request.region()        != null ? request.region()        : producer.getRegion(),
                request.website()       != null ? request.website()       : producer.getWebsite(),
                request.foundedYear()   != null ? request.foundedYear()   : producer.getFoundedYear(),
                request.descriptionKo() != null ? request.descriptionKo() : producer.getDescriptionKo(),
                request.descriptionEn() != null ? request.descriptionEn() : producer.getDescriptionEn(),
                request.searchKeywords() != null ? request.searchKeywords() : producer.getSearchKeywords()
        );
        return ProducerResponse.from(producer);
    }

    @Transactional
    public void delete(Long id) {
        Producer producer = getProducer(id);
        producerRepository.delete(producer);
    }

    // ── 사용자 등록 요청 ─────────────────────────────────────────

    @Transactional
    public ProducerRegisterRequestResponse submitProducerRequest(
            ProducerRegisterRequestBody body, Long userId) {
        User user = getUser(userId);
        String data = serialize(body);

        ProducerRegisterRequest req = ProducerRegisterRequest.builder()
                .user(user)
                .producerData(data)
                .build();

        ProducerRegisterRequest saved = producerRequestRepository.save(req);
        return toResponse(saved, body);
    }

    @Transactional(readOnly = true)
    public List<ProducerRegisterRequestResponse> getMyProducerRequests(Long userId) {
        return producerRequestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(req -> toResponse(req, parseData(req.getProducerData())))
                .toList();
    }

    // ── 관리자 — 등록 요청 처리 ──────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ProducerRegisterRequestResponse> getProducerRequests(
            RequestStatus status, Pageable pageable) {
        return producerRequestRepository.findByStatus(status, pageable)
                .map(req -> toResponse(req, parseData(req.getProducerData())));
    }

    @Transactional(readOnly = true)
    public ProducerRegisterRequestResponse getProducerRequestDetail(Long requestId) {
        ProducerRegisterRequest req = getProducerRequest(requestId);
        return toResponse(req, parseData(req.getProducerData()));
    }

    @Transactional
    public ProducerRegisterRequestResponse updateProducerRequest(
            Long requestId, ProducerRegisterRequestBody body) {
        ProducerRegisterRequest req = getProducerRequest(requestId);
        if (req.getStatus() != RequestStatus.PENDING) {
            throw new CustomException(ErrorCode.DISTILLERY_REQUEST_NOT_EDITABLE);
        }
        req.updateProducerData(serialize(body));
        return toResponse(req, body);
    }

    @Transactional
    public ProducerResponse approveProducerRequest(Long requestId, Long adminId) {
        ProducerRegisterRequest req = getProducerRequest(requestId);
        // [상태전이 가드] 검토 대기(PENDING)에서만 승인 가능 — 이미 반려(REJECTED)된 요청이
        //   재승인되어 Producer 가 중복 생성되는 것을 방지.
        if (req.getStatus() != RequestStatus.PENDING) {
            throw new CustomException(ErrorCode.DISTILLERY_REQUEST_NOT_EDITABLE);
        }
        User admin = getUser(adminId);
        ProducerRegisterRequestBody body = parseData(req.getProducerData());

        Producer producer = Producer.builder()
                .type(body.type() != null ? body.type() : ProducerType.DISTILLERY)
                .nameKo(body.nameKo())
                .nameEn(body.nameEn())
                .country(body.country())
                .region(body.region())
                .website(body.website())
                .foundedYear(body.foundedYear())
                .descriptionKo(body.descriptionKo())
                .descriptionEn(body.descriptionEn())
                .build();

        Producer saved = producerRepository.save(producer);
        req.approve(admin);

        notificationService.send(
                req.getUser(),
                NotificationType.REQUEST_APPROVED,
                "증류소 등록 요청 '" + body.nameKo() + "'이(가) 승인되었습니다.",
                "DISTILLERY_REQUEST",
                requestId
        );

        return ProducerResponse.from(saved);
    }

    @Transactional
    public void rejectProducerRequest(Long requestId, String rejectReason, Long adminId) {
        ProducerRegisterRequest req = getProducerRequest(requestId);
        User admin = getUser(adminId);
        ProducerRegisterRequestBody body = parseData(req.getProducerData());
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

    private Producer getProducer(Long id) {
        return producerRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.getByIdOrThrow(userId);
    }

    private ProducerRegisterRequest getProducerRequest(Long id) {
        return producerRequestRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_REQUEST_NOT_FOUND));
    }

    private ProducerRegisterRequestBody parseData(String json) {
        try {
            return objectMapper.readValue(json, ProducerRegisterRequestBody.class);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String serialize(ProducerRegisterRequestBody body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private ProducerRegisterRequestResponse toResponse(
            ProducerRegisterRequest req, ProducerRegisterRequestBody body) {
        return new ProducerRegisterRequestResponse(
                req.getId(),
                req.getUser().getId(),
                req.getUser().getNickname(),
                body.nameKo(),
                body.nameEn(),
                body.country(),
                body.region(),
                body.type(),
                req.getStatus(),
                req.getRejectReason(),
                req.getCreatedAt(),
                req.getReviewedAt(),
                body.website(),
                body.foundedYear(),
                body.descriptionKo(),
                body.descriptionEn()
        );
    }
}
