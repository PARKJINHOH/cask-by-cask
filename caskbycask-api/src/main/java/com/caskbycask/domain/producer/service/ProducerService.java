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
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import com.caskbycask.domain.spirit.service.LegacyWineRegionResolver;
import com.caskbycask.domain.spirit.service.WineRegionService;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProducerService {

    private final ProducerRepository producerRepository;
    private final SpiritRepository spiritRepository;
    private final ProducerRegisterRequestRepository producerRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ValidatedImageUploader validatedImageUploader;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final LegacyWineRegionResolver legacyWineRegionResolver;
    private final WineRegionService wineRegionService;

    // ── 공개 조회 ──────────────────────────────────────────────

    /**
     * @param hasLogo true 면 로고가 등록된 생산자만 돌려준다.
     *   포토카드에서 로고를 고를 때 쓴다 — 로고 없는 곳을 섞어 보여 주면 고를 수 없는 항목만 늘어난다.
     */
    @Transactional(readOnly = true)
    public Page<ProducerResponse> search(
            String keyword, String nameKo, String nameEn, String country, Integer foundedYear,
            ProducerType type, Boolean hasLogo, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String nameKoParam = StringUtils.hasText(nameKo) ? nameKo.trim() : null;
        String nameEnParam = StringUtils.hasText(nameEn) ? nameEn.trim() : null;
        String countryParam = StringUtils.hasText(country) ? country.trim() : null;
        // 쿼리는 "null 이면 전체"만 본다. false 로 와도 거르지 않도록 여기서 null 로 눕힌다.
        Boolean logoOnly = Boolean.TRUE.equals(hasLogo) ? Boolean.TRUE : null;
        return producerRepository.search(keywordParam, nameKoParam, nameEnParam, countryParam,
                        foundedYear, type, logoOnly, pageable)
                .map(ProducerResponse::from);
    }

    @Transactional(readOnly = true)
    public ProducerResponse findById(Long id) {
        return ProducerResponse.from(getProducer(id));
    }

    @Transactional(readOnly = true)
    public Page<AdminProducerResponse> searchForAdmin(
            String keyword, String nameKo, String nameEn, String country, Integer foundedYear,
            ProducerType type, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String nameKoParam = StringUtils.hasText(nameKo) ? nameKo.trim() : null;
        String nameEnParam = StringUtils.hasText(nameEn) ? nameEn.trim() : null;
        String countryParam = StringUtils.hasText(country) ? country.trim() : null;
        Page<Producer> producers = producerRepository.search(
                keywordParam, nameKoParam, nameEnParam, countryParam, foundedYear, type, null, pageable);
        List<Long> producerIds = producers.getContent().stream().map(Producer::getId).toList();
        Map<Long, Long> spiritCounts = producerIds.isEmpty()
                ? Map.of()
                : spiritRepository.countCatalogSpiritsByProducerIds(producerIds).stream()
                        .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        return producers.map(producer -> AdminProducerResponse.of(
                producer, spiritCounts.getOrDefault(producer.getId(), 0L)));
    }

    // ── 관리자 CRUD ─────────────────────────────────────────────

    @Transactional
    public ProducerResponse create(CreateProducerRequest request) {
        ProducerType type = request.type() != null ? request.type() : ProducerType.DISTILLERY;
        Producer producer = Producer.builder()
                .type(type)
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .country(request.country())
                .region(request.region())
                .regionCode(resolveRegionCode(type, request.country(), request.region(), request.regionCode()))
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
        ProducerType type = request.type() != null ? request.type() : producer.getType();
        String country = request.country() != null ? request.country() : producer.getCountry();
        String region = request.region() != null ? request.region() : producer.getRegion();
        producer.update(
                type,
                request.nameKo()        != null ? request.nameKo()        : producer.getNameKo(),
                request.nameEn()        != null ? request.nameEn()        : producer.getNameEn(),
                country,
                region,
                resolveRegionCode(type, country, region, request.regionCode()),
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
                .regionCode(resolveRegionCode(
                        body.type() != null ? body.type() : ProducerType.DISTILLERY,
                        body.country(), body.region(), null))
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

    /**
     * 생산자의 산지 코드를 정한다.
     *
     * <p>관리자가 산지 선택기로 고른 코드({@code requestedCode})가 있으면 그 값을 그대로 쓴다 —
     * 세부 산지(예: 꼬냑의 크뤼)는 지역 텍스트("꼬냑")만으로는 표현할 수 없기 때문이다.
     * 코드가 없으면(사용자 등록 요청 등) 기존처럼 국가·지역 텍스트에서 해석한다.
     */
    private WineRegion resolveRegionCode(
            ProducerType type, String country, String region, String requestedCode) {
        SpiritCategory category = switch (type) {
            case DISTILLERY -> SpiritCategory.WHISKY;
            case WINERY -> SpiritCategory.WINE;
            case COGNAC_HOUSE -> SpiritCategory.COGNAC;
            case OTHER -> SpiritCategory.OTHER;
        };
        if (StringUtils.hasText(requestedCode)) {
            return wineRegionService.resolve(requestedCode.trim(), category);
        }
        return legacyWineRegionResolver.resolve(category, country, region).orElse(null);
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

    // ─── 로고 이미지 ───────────────────────────────────────────────
    // UpdateProducerRequest 가 "null = 변경 안 함" 규약이라 JSON 필드로는 '삭제'를 표현할 수 없다.
    // 프로필 이미지와 같은 방식으로 업로드/삭제 엔드포인트를 따로 둔다.

    @Transactional
    public ProducerResponse uploadLogo(Long producerId, MultipartFile file) {
        Producer producer = producerRepository.findById(producerId)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));

        // 로고는 글자·도형이 많아 손실 압축에서 뭉개진다 → 무손실 WebP.
        StoredImage stored = validatedImageUploader.uploadLossless(file, "producers");

        String previousFileName = producer.getLogoSavedFileName();
        String previousSubPath = producer.getLogoSubPath();
        producer.updateLogo(stored.imageUrl(), stored.savedFileName(), stored.subPath());

        deleteStoredFileAfterCommit(previousFileName, previousSubPath);
        return ProducerResponse.from(producer);
    }

    @Transactional
    public ProducerResponse deleteLogo(Long producerId) {
        Producer producer = producerRepository.findById(producerId)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));

        String fileName = producer.getLogoSavedFileName();
        String subPath = producer.getLogoSubPath();
        producer.removeLogo();

        deleteStoredFileAfterCommit(fileName, subPath);
        return ProducerResponse.from(producer);
    }

    /** 커밋이 확정된 뒤에만 물리 파일을 지운다(롤백 시 파일만 사라지는 사고 방지). */
    private void deleteStoredFileAfterCommit(String savedFileName, String subPath) {
        if (savedFileName == null || subPath == null) return;
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        fileStorageService.delete(savedFileName, subPath);
                    }
                });
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
