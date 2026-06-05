package com.drinkindex.domain.spirit.service;

import com.drinkindex.domain.producer.entity.Producer;
import com.drinkindex.domain.producer.repository.ProducerRepository;
import com.drinkindex.domain.score.constant.ScoreActions;
import com.drinkindex.domain.score.service.ScoreService;
import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.service.NotificationService;
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
import com.drinkindex.global.util.BadWordFilter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpiritService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final Set<String> ALLOWED_EXTENSIONS    = Set.of("jpg", "jpeg", "png");
    private static final long        MAX_FILE_SIZE          = 10L * 1024 * 1024;

    @Value("${upload.path}")
    private String uploadPath;

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final SpiritRegisterRequestRepository registerRequestRepository;
    private final ProducerRepository producerRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final SpiritDetailService spiritDetailService;
    private final ScoreService scoreService;
    private final NotificationService notificationService;
    private final BadWordFilter badWordFilter;

    // ── 공개 조회 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<SpiritListResponse> searchSpirits(SpiritSearchCondition condition,
                                                   Pageable pageable) {
        return spiritRepository.search(condition, pageable);
    }

    @Transactional(readOnly = true)
    public List<CountryStatsResponse> getCountryStats(SpiritCategory category) {
        return spiritRepository.findCountryStats(category).stream()
                .map(row -> new CountryStatsResponse((String) row[0], (Long) row[1]))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RegionStatsResponse> getRegionStats(SpiritCategory category, String country) {
        return spiritRepository.findRegionStats(category, country).stream()
                .map(row -> new RegionStatsResponse((String) row[0], (Long) row[1]))
                .toList();
    }

    @Transactional(readOnly = true)
    public SpiritDetailResponse getSpiritDetail(Long id) {
        Spirit spirit = spiritRepository.findByIdWithAllDetails(id, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        List<SpiritImageResponse> images = spiritImageRepository.findBySpiritId(id)
                .stream()
                .map(SpiritImageResponse::from)
                .toList();

        return spiritDetailService.buildFullDetailResponse(spirit, images);
    }

    // ── 관리자 CRUD ─────────────────────────────────────────

    @Transactional
    public SpiritDetailResponse createSpirit(CreateSpiritRequest request, Long userId) {
        User registeredBy = getUser(userId);
        Producer producer = resolveProducer(request.producerId());

        // PARTNER는 producerId 미입력 시 자신의 증류소 자동 사용
        if (registeredBy.getRole() == Role.PARTNER && producer == null
                && registeredBy.getProducer() != null) {
            producer = registeredBy.getProducer();
        }

        verifyProducerAccess(registeredBy, producer);

        Spirit spirit = Spirit.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .category(request.category())
                .producer(producer)
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

        Spirit saved = spiritRepository.save(spirit);

        spiritDetailService.saveCommonDetail(saved, request.commonDetail());
        spiritDetailService.saveCategoryDetail(saved, request);

        return SpiritDetailResponse.of(saved, List.of());
    }

    @Transactional
    public SpiritDetailResponse updateSpirit(Long id, UpdateSpiritRequest request, Long userId) {
        Spirit spirit = getSpirit(id);
        User user = getUser(userId);

        verifyProducerAccess(user, spirit.getProducer());

        Producer producer = request.producerId() != null
                ? resolveProducer(request.producerId())
                : spirit.getProducer();

        SpiritCategory prevCategory = spirit.getCategory();

        spirit.update(
                request.nameKo() != null ? request.nameKo() : spirit.getNameKo(),
                request.nameEn() != null ? request.nameEn() : spirit.getNameEn(),
                request.category() != null ? request.category() : spirit.getCategory(),
                producer,
                request.bottler() != null ? request.bottler() : spirit.getBottler(),
                request.bottledYear() != null ? request.bottledYear() : spirit.getBottledYear(),
                request.vintageYear() != null ? request.vintageYear() : spirit.getVintageYear(),
                request.abv() != null ? request.abv() : spirit.getAbv(),
                request.volumeMl() != null ? request.volumeMl() : spirit.getVolumeMl(),
                request.country() != null ? request.country() : spirit.getCountry(),
                request.region() != null ? request.region() : spirit.getRegion()
        );

        spiritDetailService.saveCommonDetail(spirit, request.commonDetail());
        spiritDetailService.updateCategoryDetail(spirit, prevCategory, request);

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

        // 카테고리 핵심값 필수 (신청자 제출 경로)
        if (!body.hasCategoryCore()) throw new CustomException(ErrorCode.INVALID_INPUT);

        // 욕설 필터 — 신청자가 입력한 기타 문구 검사
        badWordFilter.validate(body.note());

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

        // [숙성력] 술 등록 요청 점수 지급
        scoreService.award(userId, ScoreActions.SPIRIT_REQUEST, "SPIRIT_REQUEST", saved.getId());

        return toRegisterResponse(saved, body.nameKo(), body.nameEn(), body.category());
    }

    @Transactional(readOnly = true)
    public List<SpiritRegisterRequestResponse> getMyRegisterRequests(Long userId) {
        return registerRequestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::parseRegisterResponse)
                .toList();
    }

    /** 본인 요청 상세 (수정 폼 프리필용) */
    @Transactional(readOnly = true)
    public SpiritRegisterRequestDetailResponse getMyRegisterRequestDetail(Long requestId, Long userId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        verifyRequestOwner(req, userId);
        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        return SpiritRegisterRequestDetailResponse.of(req, body, resolveProducerName(body.producerId()));
    }

    /** 본인 요청 수정 — 검토 중(PENDING)·반려(REJECTED)만 가능. 반려 건은 재검토(PENDING) 전환. */
    @Transactional
    public SpiritRegisterRequestResponse updateMyRegisterRequest(
            Long requestId, SpiritRegisterRequestBody body, Long userId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        verifyRequestOwner(req, userId);
        if (req.getStatus() == RequestStatus.APPROVED) {
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_NOT_EDITABLE);
        }

        // 카테고리 핵심값 필수 (신청자 수정 경로)
        if (!body.hasCategoryCore()) throw new CustomException(ErrorCode.INVALID_INPUT);

        badWordFilter.validate(body.note());

        // 이미지 URL은 별도 엔드포인트로만 관리 — 필드 수정 시 기존 이미지 보존
        SpiritRegisterRequestBody existing = parseSpiritData(req.getSpiritData());
        SpiritRegisterRequestBody merged = withImageUrls(body, existing.imageUrls());

        req.updateSpiritData(serialize(merged));
        req.resubmit(); // 반려 건이면 PENDING 으로 복귀, 반려 사유 초기화

        return toRegisterResponse(req, merged.nameKo(), merged.nameEn(), merged.category());
    }

    /** 본인 요청 삭제 — 승인 건 제외. 지급된 등록 점수 회수. */
    @Transactional
    public void deleteMyRegisterRequest(Long requestId, Long userId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        verifyRequestOwner(req, userId);
        if (req.getStatus() == RequestStatus.APPROVED) {
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_NOT_EDITABLE);
        }

        // [숙성력] 등록 시 지급된 점수 회수 (지급 이력 기반, 익명·관리자면 자동 스킵)
        scoreService.deductByReference(userId, ScoreActions.SPIRIT_REQUEST, "SPIRIT_REQUEST", requestId);

        registerRequestRepository.delete(req);
    }

    private void verifyRequestOwner(SpiritRegisterRequest req, Long userId) {
        if (!req.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_ACCESS_DENIED);
        }
    }

    // ── 관리자 — 등록 요청 처리 ─────────────────────────────

    @Transactional(readOnly = true)
    public Page<SpiritRegisterRequestResponse> getRegisterRequests(
            RequestStatus status, Pageable pageable) {
        Page<SpiritRegisterRequest> page = (status == null)
                ? registerRequestRepository.findAll(pageable)
                : registerRequestRepository.findByStatus(status, pageable);
        return page.map(this::parseRegisterResponse);
    }

    @Transactional(readOnly = true)
    public SpiritRegisterRequestDetailResponse getRegisterRequestDetail(Long requestId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        return SpiritRegisterRequestDetailResponse.of(req, body, resolveProducerName(body.producerId()));
    }

    @Transactional
    public SpiritRegisterRequestDetailResponse updateRegisterRequest(
            Long requestId, SpiritRegisterRequestBody body) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        SpiritRegisterRequestBody existing = parseSpiritData(req.getSpiritData());

        // 이미지 URL은 별도 엔드포인트로만 관리 — 필드 수정 시 기존 이미지 보존
        SpiritRegisterRequestBody merged = new SpiritRegisterRequestBody(
                body.nameKo(), body.nameEn(), body.category(),
                body.producerId(), body.bottler(), body.bottledYear(), body.vintageYear(),
                body.abv(), body.volumeMl(), body.country(), body.region(),
                // 신청자 입력 상세값(숙성/연월/카테고리 핵심값)은 관리자 수정 폼에 없으므로 기존값 보존
                existing.ageStatement(), existing.isNas(), existing.distilledDate(),
                existing.bottledDate(), existing.releaseDate(),
                existing.whiskyStyle(), existing.whiskyStyleOther(), existing.caskNo(),
                existing.wineType(), existing.cognacGrade(), existing.otherType(),
                existing.imageUrls(),
                existing.note()
        );

        req.updateSpiritData(serialize(merged));
        return SpiritRegisterRequestDetailResponse.of(req, merged, resolveProducerName(merged.producerId()));
    }

    @Transactional
    public SpiritRegisterRequestDetailResponse uploadRequestImage(Long requestId, MultipartFile file) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        validateImageFile(file);

        String filename = UUID.randomUUID() + "." + getExtension(file.getOriginalFilename());
        String imageUrl = saveRequestFile(requestId, filename, file);

        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        List<String> imageUrls = new ArrayList<>(body.imageUrls() != null ? body.imageUrls() : List.of());
        imageUrls.add(imageUrl);

        SpiritRegisterRequestBody updated = withImageUrls(body, imageUrls);
        req.updateSpiritData(serialize(updated));
        return SpiritRegisterRequestDetailResponse.of(req, updated, resolveProducerName(updated.producerId()));
    }

    @Transactional
    public SpiritRegisterRequestDetailResponse removeRequestImageUrl(Long requestId, String imageUrl) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());

        List<String> imageUrls = new ArrayList<>(body.imageUrls() != null ? body.imageUrls() : List.of());
        imageUrls.remove(imageUrl);

        SpiritRegisterRequestBody updated = withImageUrls(body, imageUrls);
        req.updateSpiritData(serialize(updated));
        return SpiritRegisterRequestDetailResponse.of(req, updated, resolveProducerName(updated.producerId()));
    }

    @Transactional
    public SpiritDetailResponse approveRegisterRequest(Long requestId, Long adminId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        User admin = getUser(adminId);

        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        Producer producer = resolveProducer(body.producerId());

        Spirit spirit = Spirit.builder()
                .nameKo(body.nameKo())
                .nameEn(body.nameEn())
                .category(body.category())
                .producer(producer)
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

        // 신청자가 요청 시 입력한 공통 상세값(숙성/증류·병입 연월/출시일/도수/용량)을 자동 반영
        spiritDetailService.saveCommonDetail(saved, new SpiritCommonDetailRequest(
                body.isNas(), body.ageStatement(),
                body.distilledDate(), body.bottledDate(), body.releaseDate(),
                body.volumeMl(), body.abv(),
                null, null, null));

        // 신청자가 요청 시 입력한 카테고리 핵심값을 상세에 자동 반영
        spiritDetailService.saveCategoryCore(saved,
                body.whiskyStyle(), body.whiskyStyleOther(),
                body.wineType(), body.cognacGrade(), body.otherType());

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

        // [숙성력] 술 등록 요청 승인 — 요청자(관리자 아님)에게 지급
        scoreService.award(req.getUser().getId(), ScoreActions.SPIRIT_REQUEST_APPROVED, "SPIRIT_REQUEST", requestId);

        notificationService.send(
                req.getUser(),
                NotificationType.REQUEST_APPROVED,
                "술 등록 요청 '" + body.nameKo() + "'이(가) 승인되었습니다.",
                "SPIRIT",
                saved.getId()
        );

        return SpiritDetailResponse.of(saved,
                images.stream().map(SpiritImageResponse::from).toList());
    }

    /**
     * 관리자가 등록 요청 상세 화면(= 새 술 등록과 동일 폼)에서 세부 정보를 완성해 승인.
     * 신청자가 제출한 기본값을 관리자가 보완한 전체 상세(detail)로 술을 생성한다.
     */
    @Transactional
    public SpiritDetailResponse approveRegisterRequestWithDetail(
            Long requestId, CreateSpiritRequest detail, Long adminId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        if (req.getStatus() == RequestStatus.APPROVED) {
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_NOT_EDITABLE);
        }
        User admin = getUser(adminId);

        Producer producer = resolveProducer(detail.producerId());

        Spirit spirit = Spirit.builder()
                .nameKo(detail.nameKo())
                .nameEn(detail.nameEn())
                .category(detail.category())
                .producer(producer)
                .bottler(detail.bottler())
                .bottledYear(detail.bottledYear())
                .vintageYear(detail.vintageYear())
                .abv(detail.abv())
                .volumeMl(detail.volumeMl())
                .country(detail.country())
                .region(detail.region())
                .status(SpiritStatus.ACTIVE)
                .registeredBy(req.getUser())
                .build();

        Spirit saved = spiritRepository.save(spirit);

        spiritDetailService.saveCommonDetail(saved, detail.commonDetail());
        spiritDetailService.saveCategoryDetail(saved, detail);

        // 신청 시 첨부된 이미지 승계
        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        List<SpiritImage> images = List.of();
        if (body.imageUrls() != null && !body.imageUrls().isEmpty()) {
            images = body.imageUrls().stream()
                    .map(url -> SpiritImage.builder()
                            .spirit(saved).imageUrl(url).isPrimary(false).sortOrder(0).build())
                    .toList();
            images.get(0).markAsPrimary();
            spiritImageRepository.saveAll(images);
        }

        req.approve(admin);

        // [숙성력] 술 등록 요청 승인 — 요청자에게 지급
        scoreService.award(req.getUser().getId(), ScoreActions.SPIRIT_REQUEST_APPROVED, "SPIRIT_REQUEST", requestId);

        notificationService.send(
                req.getUser(),
                NotificationType.REQUEST_APPROVED,
                "술 등록 요청 '" + detail.nameKo() + "'이(가) 승인되었습니다.",
                "SPIRIT",
                saved.getId()
        );

        return SpiritDetailResponse.of(saved,
                images.stream().map(SpiritImageResponse::from).toList());
    }

    @Transactional
    public void rejectRegisterRequest(Long requestId, String rejectReason, Long adminId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        User admin = getUser(adminId);
        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());
        req.reject(admin, rejectReason);
        notificationService.send(
                req.getUser(),
                NotificationType.REQUEST_REJECTED,
                "술 등록 요청 '" + body.nameKo() + "'이(가) 반려되었습니다.",
                "SPIRIT_REQUEST",
                requestId
        );
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

    private Producer resolveProducer(Long producerId) {
        if (producerId == null) return null;
        return producerRepository.findById(producerId)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
    }

    private String resolveProducerName(Long producerId) {
        if (producerId == null) return null;
        return producerRepository.findById(producerId)
                .map(Producer::getNameKo)
                .orElse(null);
    }

    private void verifyProducerAccess(User user, Producer producer) {
        if (user.getRole() != Role.PARTNER) return;
        if (producer == null
                || user.getProducer() == null
                || !user.getProducer().getId().equals(producer.getId())) {
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

    private String serialize(SpiritRegisterRequestBody body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private SpiritRegisterRequestBody withImageUrls(SpiritRegisterRequestBody body, List<String> imageUrls) {
        return new SpiritRegisterRequestBody(
                body.nameKo(), body.nameEn(), body.category(),
                body.producerId(), body.bottler(), body.bottledYear(), body.vintageYear(),
                body.abv(), body.volumeMl(), body.country(), body.region(),
                body.ageStatement(), body.isNas(), body.distilledDate(),
                body.bottledDate(), body.releaseDate(),
                body.whiskyStyle(), body.whiskyStyleOther(), body.caskNo(),
                body.wineType(), body.cognacGrade(), body.otherType(),
                imageUrls,
                body.note()
        );
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

    // ── 요청 이미지 업로드 ───────────────────────────────────

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        if (file.getSize() > MAX_FILE_SIZE) throw new CustomException(ErrorCode.IMAGE_SIZE_EXCEEDED);
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_CONTENT_TYPES.contains(ct.toLowerCase()))
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        if (!ALLOWED_EXTENSIONS.contains(getExtension(file.getOriginalFilename()).toLowerCase()))
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1);
    }

    private String saveRequestFile(Long requestId, String filename, MultipartFile file) {
        try {
            Path dir = Paths.get(uploadPath, "requests", requestId.toString());
            Files.createDirectories(dir);
            file.transferTo(dir.resolve(filename));
            return "/uploads/requests/" + requestId + "/" + filename;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
