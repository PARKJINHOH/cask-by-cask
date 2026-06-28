package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.spirit.dto.*;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.SpiritRegisterRequest;
import com.caskbycask.domain.spirit.entity.SpiritVariantLink;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantLinkType;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpiritService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS    = Set.of("jpg", "jpeg", "png", "webp");
    private static final long        MAX_FILE_SIZE          = 10L * 1024 * 1024;
    private static final int         MAX_REQUEST_IMAGES     = 3;

    @Value("${upload.path}")
    private String uploadPath;

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final SpiritVariantLinkRepository variantLinkRepository;
    private final SpiritRegisterRequestRepository registerRequestRepository;
    private final ProducerRepository producerRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final SpiritDetailService spiritDetailService;
    private final SpiritImageService spiritImageService;
    private final ScoreService scoreService;
    private final NotificationService notificationService;
    private final BadWordFilter badWordFilter;
    private final SpiritSearchService spiritSearchService;

    // ── 공개 조회 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SpiritAutocompleteResponse> autocomplete(String keyword) {
        return spiritSearchService.autocompleteSpirits(keyword);
    }

    @Transactional(readOnly = true)
    public Page<SpiritListResponse> searchSpirits(SpiritSearchCondition condition,
                                                   Pageable pageable) {
        if (org.springframework.util.StringUtils.hasText(condition.keyword())) {
            Page<Long> idPage = spiritSearchService.searchSpiritIds(condition, pageable);
            if (idPage.isEmpty()) {
                return Page.empty(pageable);
            }
            List<SpiritListResponse> content = spiritRepository.findListByIds(idPage.getContent(), false);
            return new org.springframework.data.domain.PageImpl<>(content, pageable, idPage.getTotalElements());
        }
        return spiritRepository.search(condition, pageable);
    }

    @Transactional(readOnly = true)
    public Page<SpiritListResponse> searchSpiritsForAdmin(SpiritSearchCondition condition,
                                                          Pageable pageable) {
        if (org.springframework.util.StringUtils.hasText(condition.keyword())) {
            Page<Long> idPage = spiritSearchService.searchSpiritIds(condition, pageable);
            if (idPage.isEmpty()) {
                return Page.empty(pageable);
            }
            List<SpiritListResponse> content = spiritRepository.findListByIds(idPage.getContent(), true);
            return new org.springframework.data.domain.PageImpl<>(content, pageable, idPage.getTotalElements());
        }
        return spiritRepository.searchForAdmin(condition, pageable);
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

        List<SpiritImageResponse> images = displayImages(spirit);

        List<SpiritVariantResponse> variants = getVariantsResponse(spirit, true);

        return spiritDetailService.buildFullDetailResponse(spirit, images, variants);
    }

    /** 관리자 상세 조회 — 상태(ACTIVE/HIDDEN/PENDING) 무관 */
    @Transactional(readOnly = true)
    public SpiritDetailResponse getSpiritDetailForAdmin(Long id) {
        Spirit spirit = spiritRepository.findByIdWithAllDetails(id, null)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        List<SpiritImageResponse> images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(id)
                .stream()
                .map(SpiritImageResponse::from)
                .toList();

        List<SpiritVariantResponse> variants = getVariantsResponse(spirit, false);

        return spiritDetailService.buildFullDetailResponse(spirit, images, variants);
    }

    private List<SpiritImageResponse> displayImages(Spirit spirit) {
        List<SpiritImage> images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spirit.getId());
        if (images.isEmpty() && spirit.getParent() != null) {
            images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spirit.getParent().getId());
        }
        return images.stream()
                .map(SpiritImageResponse::from)
                .toList();
    }

    /**
     * 같은 이름(한글/영문)의 다른 배치·병입 제품 목록 — 사용자 상세 화면용.
     * 자동(이름) 매치에 관리자 수동 오버라이드를 적용: (자동 ∪ MANUAL) − EXCLUDED. ACTIVE 만 노출.
     */
    @Transactional(readOnly = true)
    public List<SpiritVariantResponse> getSpiritVariants(Long id) {
        Spirit spirit = spiritRepository.findByIdAndStatus(id, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        return getVariantsResponse(spirit, true);
    }

    private List<SpiritVariantResponse> getVariantsResponse(Spirit spirit, boolean activeOnly) {
        Map<Long, Spirit> variantsMap = resolveVariants(spirit, activeOnly);
        if (variantsMap.isEmpty()) return List.of();

        Map<Long, String> primaryImageMap = primaryImageMap(variantsMap.keySet());
        return variantsMap.values().stream()
                .map(v -> SpiritVariantResponse.of(
                        v,
                        primaryImageMap.get(v.getId()),
                        SpiritCommonDetailResponse.from(v.getCommonDetail()),
                        spiritDetailService.buildVariantWhiskyDetail(v)))
                .toList();
    }

    /** 관리자용 연관 술 목록 — 상태 무관(MANUAL 은 HIDDEN 도 포함), 각 항목에 출처(AUTO/MANUAL) 표시. */
    @Transactional(readOnly = true)
    public List<AdminSpiritVariantResponse> getSpiritVariantsForAdmin(Long id) {
        Spirit spirit = spiritRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        Set<Long> autoIds = spiritRepository
                .findActiveVariantsByName(id, spirit.getNameKo(), spirit.getNameEn())
                .stream().map(Spirit::getId).collect(Collectors.toSet());

        Map<Long, Spirit> variants = resolveVariants(spirit, false);
        if (variants.isEmpty()) return List.of();

        Map<Long, String> primaryImageMap = primaryImageMap(variants.keySet());
        return variants.values().stream()
                .map(v -> AdminSpiritVariantResponse.of(
                        v,
                        primaryImageMap.get(v.getId()),
                        autoIds.contains(v.getId()) ? "AUTO" : "MANUAL"))
                .toList();
    }

    /** 관리자: 연관 술 수동 추가(양방향). 이미 EXCLUDED 였으면 MANUAL 로 복원. */
    @Transactional
    public void addVariantLink(Long id, Long targetId) {
        if (id.equals(targetId)) {
            throw new CustomException(ErrorCode.SPIRIT_VARIANT_SELF_NOT_ALLOWED);
        }
        if (!spiritRepository.existsById(id) || !spiritRepository.existsById(targetId)) {
            throw new CustomException(ErrorCode.SPIRIT_NOT_FOUND);
        }
        upsertLink(id, targetId, VariantLinkType.MANUAL);
    }

    /**
     * 관리자: 연관 술 제거(양방향).
     * 대상이 이름 자동 매치이면 EXCLUDED 로 숨김, 순수 수동이었으면 링크 자체 삭제.
     */
    @Transactional
    public void removeVariantLink(Long id, Long targetId) {
        Spirit spirit = spiritRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        boolean isAuto = spiritRepository
                .findActiveVariantsByName(id, spirit.getNameKo(), spirit.getNameEn())
                .stream().anyMatch(s -> s.getId().equals(targetId));

        if (isAuto) {
            upsertLink(id, targetId, VariantLinkType.EXCLUDED);
        } else {
            findLink(id, targetId).ifPresent(variantLinkRepository::delete);
        }
    }

    // ── 연관 술 내부 헬퍼 ─────────────────────────────────────

    /** (자동 ∪ MANUAL) − EXCLUDED 를 적용한 연관 술 맵(삽입 순서 유지). activeManualOnly=true 면 MANUAL 도 ACTIVE 만 포함. */
    private Map<Long, Spirit> resolveVariants(Spirit spirit, boolean activeManualOnly) {
        Long id = spirit.getId();
        Long masterId = spirit.getParent() != null ? spirit.getParent().getId() : id;

        LinkedHashMap<Long, Spirit> map = new LinkedHashMap<>();

        // 1. parent_id를 가진 하위 에디션들 조회 (신규 아키텍처)
        List<Spirit> parentVariants = spiritRepository.findByParentId(masterId);
        parentVariants.stream()
                .filter(s -> !activeManualOnly || s.getStatus() == SpiritStatus.ACTIVE)
                .forEach(s -> map.put(s.getId(), s));

        // 2. 만약 parent_id 계층이 설정되어 있지 않은 경우, 기존 자동 이름 매칭 및 수동 링크(Fallback) 사용
        if (map.isEmpty()) {
            List<Spirit> auto = spiritRepository.findActiveVariantsByName(
                    id, spirit.getNameKo(), spirit.getNameEn());

            List<SpiritVariantLink> links = variantLinkRepository.findAllInvolving(id);
            Set<Long> excluded = partnerIds(links, id, VariantLinkType.EXCLUDED);
            Set<Long> manual = partnerIds(links, id, VariantLinkType.MANUAL);

            auto.forEach(s -> map.put(s.getId(), s));
            if (!manual.isEmpty()) {
                spiritRepository.findAllById(manual).stream()
                        .filter(s -> !activeManualOnly || s.getStatus() == SpiritStatus.ACTIVE)
                        .forEach(s -> map.putIfAbsent(s.getId(), s));
            }
            excluded.forEach(map::remove);
        }

        map.remove(id); // 자기 자신은 목록에서 제외
        return map;
    }

    private Set<Long> partnerIds(List<SpiritVariantLink> links, Long id, VariantLinkType type) {
        return links.stream()
                .filter(l -> l.getLinkType() == type)
                .map(l -> l.partnerOf(id))
                .collect(Collectors.toSet());
    }

    private Map<Long, String> primaryImageMap(Set<Long> spiritIds) {
        return spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(new ArrayList<>(spiritIds)).stream()
                .collect(Collectors.toMap(img -> img.getSpirit().getId(), SpiritImage::getImageUrl));
    }

    private Optional<SpiritVariantLink> findLink(Long a, Long b) {
        return variantLinkRepository.findBySpiritIdAndRelatedSpiritId(Math.min(a, b), Math.max(a, b));
    }

    private void upsertLink(Long id, Long targetId, VariantLinkType type) {
        findLink(id, targetId).ifPresentOrElse(
                link -> link.changeType(type),
                () -> variantLinkRepository.save(SpiritVariantLink.of(id, targetId, type)));
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
        validateEditionSeriesIdentifier(request);
        String seriesIdentifier = resolveSeriesIdentifier(request);
        String seriesIdentifierEn = resolveSeriesIdentifierEn(request);

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
                .status(request.status() != null ? request.status() : SpiritStatus.ACTIVE)
                .registeredBy(registeredBy)
                .variantType(request.variantType())
                .variantValue(request.variantValue())
                .variantValueEn(request.variantValueEn())
                .seriesIdentifier(seriesIdentifier)
                .seriesIdentifierEn(seriesIdentifierEn)
                .abvMin(request.abvMin())
                .abvMax(request.abvMax())
                .volumeMlMin(request.volumeMlMin())
                .volumeMlMax(request.volumeMlMax())
                .build();

        Spirit saved = spiritRepository.save(spirit);

        spiritDetailService.saveCommonDetail(saved, request.commonDetail());
        spiritDetailService.saveCategoryDetail(saved, request);

        // 하위 에디션 일괄 등록 처리
        if (Boolean.TRUE.equals(request.isVariantSplit()) && request.variants() != null) {
            List<CreateVariantRequest> variants = request.variants();
            for (int i = 0; i < variants.size(); i++) {
                CreateVariantRequest vReq = variants.get(i);
                Spirit variant = Spirit.builder()
                        .nameKo(saved.getNameKo())
                        .nameEn(saved.getNameEn())
                        .category(saved.getCategory())
                        .producer(saved.getProducer())
                        .bottler(saved.getBottler())
                        .bottledYear(saved.getBottledYear())
                        .vintageYear(saved.getVintageYear())
                        .abv(vReq.abv())
                        .volumeMl(vReq.volumeMl())
                        .country(saved.getCountry())
                        .region(saved.getRegion())
                        .status(request.status() != null ? request.status() : SpiritStatus.ACTIVE)
                        .registeredBy(registeredBy)
                        .parent(saved)
                        .variantType(vReq.variantType())
                        .variantValue(vReq.variantValue())
                        .variantValueEn(vReq.variantValueEn())
                        .seriesIdentifier(normalizeSeriesIdentifier(vReq.seriesIdentifier()))
                        .seriesIdentifierEn(resolveSeriesIdentifierEn(vReq))
                        .abvMin(vReq.abvMin())
                        .abvMax(vReq.abvMax())
                        .volumeMlMin(vReq.volumeMlMin())
                        .volumeMlMax(vReq.volumeMlMax())
                        .displayOrder(i)
                        .build();

                Spirit savedVariant = spiritRepository.save(variant);
                spiritDetailService.saveCommonDetail(savedVariant, vReq.commonDetail());
                if (saved.getCategory() == SpiritCategory.WHISKY && vReq.whiskyDetail() != null) {
                    spiritDetailService.saveWhiskyDetail(savedVariant, vReq.whiskyDetail());
                }
            }
        }

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
        validateEditionSeriesIdentifier(request, spirit);
        String seriesIdentifier = resolveSeriesIdentifier(request, spirit);
        String seriesIdentifierEn = resolveSeriesIdentifierEn(request, spirit);

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
                request.region() != null ? request.region() : spirit.getRegion(),
                spirit.getParent(),
                request.variantType() != null ? request.variantType() : spirit.getVariantType(),
                request.variantValue() != null ? request.variantValue() : spirit.getVariantValue(),
                request.variantValueEn() != null ? request.variantValueEn() : spirit.getVariantValueEn(),
                seriesIdentifier,
                seriesIdentifierEn,
                // 도수 범위 지정 해제 시 null 로 명시 전송됨 — fallback 없이 그대로 반영해야 해제가 반영됨
                request.abvMin(),
                request.abvMax(),
                request.volumeMlMin(),
                request.volumeMlMax()
        );

        spiritDetailService.saveCommonDetail(spirit, request.commonDetail());
        spiritDetailService.updateCategoryDetail(spirit, prevCategory, request);

        // 하위 에디션 수정 처리 (마스터 주류일 때만 수행)
        if (spirit.getParent() == null) {
            List<Spirit> existingVariants = spiritRepository.findByParentId(id);
            if (Boolean.TRUE.equals(request.isVariantSplit()) && request.variants() != null) {
                java.util.Set<Long> processedIds = new java.util.HashSet<>();

                List<CreateVariantRequest> variants = request.variants();
                for (int i = 0; i < variants.size(); i++) {
                    CreateVariantRequest vReq = variants.get(i);
                    // 식별 값(variantValue) 기준으로 기존 에디션 탐색
                    Optional<Spirit> matching = existingVariants.stream()
                            .filter(v -> v.getVariantValue() != null && v.getVariantValue().equals(vReq.variantValue()))
                            .findFirst();

                    if (matching.isPresent()) {
                        Spirit existing = matching.get();
                        processedIds.add(existing.getId());
                        // 기존 에디션 정보 업데이트
                        existing.update(
                                spirit.getNameKo(), spirit.getNameEn(), spirit.getCategory(),
                                spirit.getProducer(), spirit.getBottler(), spirit.getBottledYear(),
                                spirit.getVintageYear(), vReq.abv(), vReq.volumeMl(),
                                spirit.getCountry(), spirit.getRegion(),
                                spirit, vReq.variantType(), vReq.variantValue(), vReq.variantValueEn(),
                                normalizeSeriesIdentifier(vReq.seriesIdentifier()),
                                resolveSeriesIdentifierEn(vReq),
                                vReq.abvMin(), vReq.abvMax(), vReq.volumeMlMin(), vReq.volumeMlMax()
                        );
                        existing.assignDisplayOrder(i);
                        spiritDetailService.saveCommonDetail(existing, vReq.commonDetail());
                        if (spirit.getCategory() == SpiritCategory.WHISKY && vReq.whiskyDetail() != null) {
                            spiritDetailService.saveWhiskyDetail(existing, vReq.whiskyDetail());
                        }
                    } else {
                        // 신규 에디션 추가
                        Spirit variant = Spirit.builder()
                                .nameKo(spirit.getNameKo())
                                .nameEn(spirit.getNameEn())
                                .category(spirit.getCategory())
                                .producer(spirit.getProducer())
                                .bottler(spirit.getBottler())
                                .bottledYear(spirit.getBottledYear())
                                .vintageYear(spirit.getVintageYear())
                                .abv(vReq.abv())
                                .volumeMl(vReq.volumeMl())
                                .country(spirit.getCountry())
                                .region(spirit.getRegion())
                                .status(spirit.getStatus())
                                .registeredBy(user)
                                .parent(spirit)
                                .variantType(vReq.variantType())
                                .variantValue(vReq.variantValue())
                                .variantValueEn(vReq.variantValueEn())
                                .seriesIdentifier(normalizeSeriesIdentifier(vReq.seriesIdentifier()))
                                .seriesIdentifierEn(resolveSeriesIdentifierEn(vReq))
                                .abvMin(vReq.abvMin())
                                .abvMax(vReq.abvMax())
                                .volumeMlMin(vReq.volumeMlMin())
                                .volumeMlMax(vReq.volumeMlMax())
                                .displayOrder(i)
                                .build();

                        Spirit savedVariant = spiritRepository.save(variant);
                        spiritDetailService.saveCommonDetail(savedVariant, vReq.commonDetail());
                        if (spirit.getCategory() == SpiritCategory.WHISKY && vReq.whiskyDetail() != null) {
                            spiritDetailService.saveWhiskyDetail(savedVariant, vReq.whiskyDetail());
                        }
                    }
                }

                // 이번 요청 목록에 포함되지 않은 기존 에디션들은 부모 관계를 해제하고 HIDDEN 처리
                for (Spirit existing : existingVariants) {
                    if (!processedIds.contains(existing.getId())) {
                        existing.update(
                                existing.getNameKo(), existing.getNameEn(), existing.getCategory(),
                                existing.getProducer(), existing.getBottler(), existing.getBottledYear(),
                                existing.getVintageYear(), existing.getAbv(), existing.getVolumeMl(),
                                existing.getCountry(), existing.getRegion(),
                                null, existing.getVariantType(), existing.getVariantValue(), existing.getVariantValueEn(),
                                existing.getSeriesIdentifier(),
                                existing.getSeriesIdentifierEn(),
                                existing.getAbvMin(), existing.getAbvMax(),
                                existing.getVolumeMlMin(), existing.getVolumeMlMax()
                        );
                        existing.hide();
                    }
                }
            } else {
                // isVariantSplit = false 이거나 variants 가 들어오지 않은 경우 기존 에디션 전체 연결 해제 및 숨김 처리
                for (Spirit existing : existingVariants) {
                    existing.update(
                            existing.getNameKo(), existing.getNameEn(), existing.getCategory(),
                            existing.getProducer(), existing.getBottler(), existing.getBottledYear(),
                            existing.getVintageYear(), existing.getAbv(), existing.getVolumeMl(),
                            existing.getCountry(), existing.getRegion(),
                            null, existing.getVariantType(), existing.getVariantValue(), existing.getVariantValueEn(),
                            existing.getSeriesIdentifier(),
                            existing.getSeriesIdentifierEn(),
                            existing.getAbvMin(), existing.getAbvMax(),
                            existing.getVolumeMlMin(), existing.getVolumeMlMax()
                    );
                    existing.hide();
                }
            }
        }

        List<SpiritImageResponse> images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(id)
                .stream().map(SpiritImageResponse::from).toList();

        return SpiritDetailResponse.of(spirit, images);
    }

    @Transactional
    public void deleteSpirit(Long id) {
        Spirit spirit = getSpirit(id);
        spirit.hide();
    }

    @Transactional
    public void restoreSpirit(Long id) {
        Spirit spirit = getSpirit(id);
        spirit.activate();
    }

    @Transactional
    public void permanentlyDeleteSpirit(Long id) {
        Spirit spirit = spiritRepository.findByIdWithAllDetails(id, null)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        List<SpiritVariantLink> links = variantLinkRepository.findAllInvolving(id);
        if (!links.isEmpty()) {
            variantLinkRepository.deleteAll(links);
        }

        spiritImageService.deleteImagesBySpiritId(id);
        spiritRepository.delete(spirit);
    }

    // ── 사용자 등록 요청 ────────────────────────────────────

    @Transactional
    public SpiritRegisterRequestResponse submitRegisterRequest(
            SpiritRegisterRequestBody body, List<MultipartFile> images, Long userId) {
        User user = getUser(userId);

        // 카테고리 핵심값 필수 (신청자 제출 경로)
        if (!body.hasCategoryCore()) throw new CustomException(ErrorCode.INVALID_INPUT);
        validateEditionSeriesIdentifier(body);

        // 욕설 필터 — 신청자가 입력한 기타 문구 검사
        badWordFilter.validate(body.note());

        List<MultipartFile> validImages = filterValidImages(images);
        int keptCount = body.imageUrls() != null ? body.imageUrls().size() : 0;
        if (keptCount + validImages.size() > MAX_REQUEST_IMAGES)
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_TOO_MANY_IMAGES);
        validImages.forEach(this::validateImageFile);

        // 먼저 저장하여 requestId 확보 (이미지 저장 경로에 필요)
        SpiritRegisterRequest request = SpiritRegisterRequest.builder()
                .user(user)
                .spiritData(serialize(body))
                .build();
        SpiritRegisterRequest saved = registerRequestRepository.save(request);

        if (!validImages.isEmpty()) {
            List<String> imageUrls = new ArrayList<>(body.imageUrls() != null ? body.imageUrls() : List.of());
            for (MultipartFile file : validImages) {
                String filename = UUID.randomUUID() + "." + getExtension(file.getOriginalFilename());
                imageUrls.add(saveRequestFile(saved.getId(), filename, file));
            }
            saved.updateSpiritData(serialize(withImageUrls(body, imageUrls)));
        }

        // [레벨] 술 등록 요청 점수 지급
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
            Long requestId, SpiritRegisterRequestBody body, List<MultipartFile> images, Long userId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        verifyRequestOwner(req, userId);
        if (req.getStatus() == RequestStatus.APPROVED) {
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_NOT_EDITABLE);
        }

        // 카테고리 핵심값 필수 (신청자 수정 경로)
        if (!body.hasCategoryCore()) throw new CustomException(ErrorCode.INVALID_INPUT);
        validateEditionSeriesIdentifier(body);

        badWordFilter.validate(body.note());

        // 이미지 = 클라이언트가 유지한 기존 URL(body.imageUrls) + 신규 업로드, 최대 3장
        List<MultipartFile> validImages = filterValidImages(images);
        List<String> imageUrls = new ArrayList<>(body.imageUrls() != null ? body.imageUrls() : List.of());
        if (imageUrls.size() + validImages.size() > MAX_REQUEST_IMAGES)
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_TOO_MANY_IMAGES);
        validImages.forEach(this::validateImageFile);
        for (MultipartFile file : validImages) {
            String filename = UUID.randomUUID() + "." + getExtension(file.getOriginalFilename());
            imageUrls.add(saveRequestFile(requestId, filename, file));
        }

        SpiritRegisterRequestBody merged = withImageUrls(body, imageUrls);

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

        // [레벨] 등록 시 지급된 점수 회수 (지급 이력 기반, 익명·관리자면 자동 스킵)
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

        // 관리자 수정 폼은 기본 필드만 전송 — 신청자 입력 상세값(숙성/연월/카테고리 핵심값/이미지/에디션 등)은
        // 기존값을 그대로 보존한다. 필드 추가에 영향받지 않도록 JSON 트리에서 기본 필드만 덮어쓴다.
        ObjectNode merged = objectMapper.valueToTree(existing);
        ObjectNode incoming = objectMapper.valueToTree(body);
        for (String f : List.of("nameKo", "nameEn", "category", "producerId", "bottler",
                "bottledYear", "vintageYear", "abv", "volumeMl", "country", "region",
                "abvMin", "abvMax", "volumeMlMin", "volumeMlMax")) {
            JsonNode v = incoming.get(f);
            if (v != null) merged.set(f, v);
            else merged.putNull(f);
        }
        SpiritRegisterRequestBody mergedBody;
        try {
            mergedBody = objectMapper.treeToValue(merged, SpiritRegisterRequestBody.class);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        req.updateSpiritData(serialize(mergedBody));
        return SpiritRegisterRequestDetailResponse.of(req, mergedBody, resolveProducerName(mergedBody.producerId()));
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
        validateEditionSeriesIdentifier(detail);
        String seriesIdentifier = resolveSeriesIdentifier(detail);
        String seriesIdentifierEn = resolveSeriesIdentifierEn(detail);

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
                .variantType(detail.variantType())
                .variantValue(detail.variantValue())
                .variantValueEn(detail.variantValueEn())
                .seriesIdentifier(seriesIdentifier)
                .seriesIdentifierEn(seriesIdentifierEn)
                .abvMin(detail.abvMin())
                .abvMax(detail.abvMax())
                .volumeMlMin(detail.volumeMlMin())
                .volumeMlMax(detail.volumeMlMax())
                .build();

        Spirit saved = spiritRepository.save(spirit);

        spiritDetailService.saveCommonDetail(saved, detail.commonDetail());
        spiritDetailService.saveCategoryDetail(saved, detail);

        // 하위 에디션 일괄 등록 처리 (createSpirit 와 동일)
        if (Boolean.TRUE.equals(detail.isVariantSplit()) && detail.variants() != null) {
            List<CreateVariantRequest> variants = detail.variants();
            for (int i = 0; i < variants.size(); i++) {
                CreateVariantRequest vReq = variants.get(i);
                Spirit variant = Spirit.builder()
                        .nameKo(saved.getNameKo())
                        .nameEn(saved.getNameEn())
                        .category(saved.getCategory())
                        .producer(saved.getProducer())
                        .bottler(saved.getBottler())
                        .bottledYear(saved.getBottledYear())
                        .vintageYear(saved.getVintageYear())
                        .abv(vReq.abv())
                        .volumeMl(vReq.volumeMl())
                        .country(saved.getCountry())
                        .region(saved.getRegion())
                        .status(SpiritStatus.ACTIVE)
                        .registeredBy(req.getUser())
                        .parent(saved)
                        .variantType(vReq.variantType())
                        .variantValue(vReq.variantValue())
                        .variantValueEn(vReq.variantValueEn())
                        .seriesIdentifier(normalizeSeriesIdentifier(vReq.seriesIdentifier()))
                        .seriesIdentifierEn(resolveSeriesIdentifierEn(vReq))
                        .abvMin(vReq.abvMin())
                        .abvMax(vReq.abvMax())
                        .volumeMlMin(vReq.volumeMlMin())
                        .volumeMlMax(vReq.volumeMlMax())
                        .displayOrder(i)
                        .build();

                Spirit savedVariant = spiritRepository.save(variant);
                spiritDetailService.saveCommonDetail(savedVariant, vReq.commonDetail());
                if (saved.getCategory() == SpiritCategory.WHISKY && vReq.whiskyDetail() != null) {
                    spiritDetailService.saveWhiskyDetail(savedVariant, vReq.whiskyDetail());
                }
            }
        }

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

        // [레벨] 술 등록 요청 승인 — 요청자에게 지급
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

    private void validateEditionSeriesIdentifier(CreateSpiritRequest request) {
        validateEditionSeriesIdentifier(request.variantType(), resolveSeriesIdentifier(request));
        validateVariantSeriesIdentifiers(request.variants());
    }

    private void validateEditionSeriesIdentifier(UpdateSpiritRequest request, Spirit spirit) {
        VariantType variantType = request.variantType() != null
                ? request.variantType()
                : spirit.getVariantType();
        validateEditionSeriesIdentifier(variantType, resolveSeriesIdentifier(request, spirit));
        validateVariantSeriesIdentifiers(request.variants());
    }

    private void validateEditionSeriesIdentifier(SpiritRegisterRequestBody body) {
        validateEditionSeriesIdentifier(body.variantType(), body.seriesIdentifier());
    }

    private void validateVariantSeriesIdentifiers(List<CreateVariantRequest> variants) {
        if (variants == null) return;
        variants.forEach(v -> validateEditionSeriesIdentifier(v.variantType(), v.seriesIdentifier()));
    }

    private void validateEditionSeriesIdentifier(VariantType variantType, String seriesIdentifier) {
        if (variantType != null
                && variantType != VariantType.NONE
                && !StringUtils.hasText(seriesIdentifier)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String resolveSeriesIdentifier(CreateSpiritRequest request) {
        String direct = normalizeSeriesIdentifier(request.seriesIdentifier());
        if (direct != null) return direct;
        if (Boolean.TRUE.equals(request.isVariantSplit()) && request.variants() != null && !request.variants().isEmpty()) {
            return normalizeSeriesIdentifier(request.variants().get(0).seriesIdentifier());
        }
        return null;
    }

    private String resolveSeriesIdentifier(UpdateSpiritRequest request, Spirit spirit) {
        VariantType requestedVariantType = request.variantType() != null
                ? request.variantType()
                : spirit.getVariantType();
        if (Boolean.FALSE.equals(request.isVariantSplit()) && requestedVariantType == VariantType.NONE) {
            return null;
        }
        if (request.seriesIdentifier() != null) {
            return normalizeSeriesIdentifier(request.seriesIdentifier());
        }
        if (Boolean.TRUE.equals(request.isVariantSplit()) && request.variants() != null && !request.variants().isEmpty()) {
            return normalizeSeriesIdentifier(request.variants().get(0).seriesIdentifier());
        }
        return spirit.getSeriesIdentifier();
    }

    private String resolveSeriesIdentifierEn(CreateSpiritRequest request) {
        String direct = normalizeSeriesIdentifier(request.seriesIdentifierEn());
        if (direct != null) return direct;
        if (Boolean.TRUE.equals(request.isVariantSplit()) && request.variants() != null && !request.variants().isEmpty()) {
            return resolveSeriesIdentifierEn(request.variants().get(0));
        }
        return normalizeSeriesIdentifier(request.seriesIdentifier());
    }

    private String resolveSeriesIdentifierEn(UpdateSpiritRequest request, Spirit spirit) {
        VariantType requestedVariantType = request.variantType() != null
                ? request.variantType()
                : spirit.getVariantType();
        if (Boolean.FALSE.equals(request.isVariantSplit()) && requestedVariantType == VariantType.NONE) {
            return null;
        }
        if (request.seriesIdentifierEn() != null) {
            String direct = normalizeSeriesIdentifier(request.seriesIdentifierEn());
            return direct != null ? direct : resolveSeriesIdentifierEnFallback(request.seriesIdentifier());
        }
        if (Boolean.TRUE.equals(request.isVariantSplit()) && request.variants() != null && !request.variants().isEmpty()) {
            return resolveSeriesIdentifierEn(request.variants().get(0));
        }
        return spirit.getSeriesIdentifierEn();
    }

    private String resolveSeriesIdentifierEn(CreateVariantRequest request) {
        String direct = normalizeSeriesIdentifier(request.seriesIdentifierEn());
        return direct != null ? direct : normalizeSeriesIdentifier(request.seriesIdentifier());
    }

    private String resolveSeriesIdentifierEnFallback(String seriesIdentifier) {
        return normalizeSeriesIdentifier(seriesIdentifier);
    }

    private String normalizeSeriesIdentifier(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Spirit getSpirit(Long id) {
        return spiritRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.getByIdOrThrow(userId);
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

    /**
     * imageUrls 만 교체한 사본을 만든다. 필드 추가에 영향받지 않도록 JSON 트리로 처리
     * (positional record 생성자 나열 금지 — 술 데이터 필드는 SpiritRegisterRequestBody 한 곳에서만 관리).
     */
    private SpiritRegisterRequestBody withImageUrls(SpiritRegisterRequestBody body, List<String> imageUrls) {
        ObjectNode node = objectMapper.valueToTree(body);
        node.set("imageUrls", objectMapper.valueToTree(imageUrls));
        try {
            return objectMapper.treeToValue(node, SpiritRegisterRequestBody.class);
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

    // ── 요청 이미지 업로드 ───────────────────────────────────

    private List<MultipartFile> filterValidImages(List<MultipartFile> images) {
        if (images == null) return List.of();
        return images.stream().filter(f -> f != null && !f.isEmpty()).toList();
    }

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
