package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.review.dto.ModerationRequest;
import com.caskbycask.domain.seo.service.ProducerIndexingEventPublisher;
import com.caskbycask.domain.seo.service.SpiritIndexingEventPublisher;
import com.caskbycask.domain.spirit.dto.*;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.SpiritImageVariant;
import com.caskbycask.domain.spirit.entity.SpiritRegisterRequest;
import com.caskbycask.domain.spirit.entity.SpiritVariantLink;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantLinkType;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritImageVariantRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.translation.service.TranslationCacheInvalidator;
import com.caskbycask.global.email.EmailSender;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpiritService {

    private static final String SPIRIT_MANAGEMENT_MENU = "/admin/spirits";
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS    = Set.of("jpg", "jpeg", "png", "webp");
    private static final long        MAX_FILE_SIZE          = 10L * 1024 * 1024;
    private static final int         MAX_REQUEST_IMAGES     = 3;

    @Value("${upload.path}")
    private String uploadPath;

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final SpiritImageVariantRepository spiritImageVariantRepository;
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
    private final EmailSender emailSender;
    private final WineRegionService wineRegionService;
    private final TranslationCacheInvalidator translationCacheInvalidator;

    /** Optional field injection keeps domain unit tests and IndexNow-disabled environments isolated. */
    @Autowired(required = false)
    private SpiritIndexingEventPublisher spiritIndexingEventPublisher;

    /**
     * 생산자 페이지는 소속 주류 목록이 곧 본문이라, 주류가 바뀌면 생산자 페이지도 바뀐다.
     * 무엇보다 생산자가 <b>색인 대상이 되는 시점</b>이 첫 활성 주류가 붙는 순간이므로,
     * 이 통지가 없으면 새 생산자는 sitemap 이 다시 크롤될 때까지 알려지지 않는다.
     */
    @Autowired(required = false)
    private ProducerIndexingEventPublisher producerIndexingEventPublisher;

    // ── 공개 조회 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SpiritAutocompleteResponse> autocomplete(String keyword) {
        return spiritSearchService.autocompleteSpirits(keyword);
    }

    @Transactional(readOnly = true)
    public List<SpiritAutocompleteResponse> autocomplete(String keyword, boolean includeVariants) {
        return spiritSearchService.autocompleteSpirits(keyword, includeVariants);
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
    public Page<SpiritListResponse> searchSpiritsForManager(
            SpiritSearchCondition condition, Pageable pageable, Long userId) {
        User user = requireSpiritManagementUser(userId);
        return searchSpiritsForAdmin(scopeToAssignedProducer(condition, user), pageable);
    }

    /**
     * 키워드 검색에서 에디션을 셀 때 훑는 마스터 ID 상한.
     * 결과가 이보다 많으면 에디션 수는 상위 N 건 기준이 된다 — 목록 위의 안내 숫자라 이 정도면 충분하고,
     * 상한이 없으면 흔한 단어 하나로 수만 건 ID 를 메모리에 올리게 된다.
     */
    private static final int EDITION_COUNT_SCAN_LIMIT = 1000;

    /**
     * 검색 조건에 걸린 주류 수 — 목록의 '총 N개' 표기용.
     *
     * 목록은 마스터만 싣지만 에디션도 등록된 제품이라 합계로 보여 준다.
     * 키워드가 있으면 목록이 전문 검색 인덱스를 타므로 카운트도 같은 경로로 센다 —
     * 규칙이 다른 쿼리를 섞으면 페이지 수와 화면 숫자가 어긋난다.
     */
    @Transactional(readOnly = true)
    public SpiritSearchCountResponse countSpirits(SpiritSearchCondition condition) {
        if (org.springframework.util.StringUtils.hasText(condition.keyword())) {
            Page<Long> idPage = spiritSearchService.searchSpiritIds(
                    condition, PageRequest.of(0, EDITION_COUNT_SCAN_LIMIT));
            long editionCount = idPage.isEmpty() ? 0L
                    : spiritRepository.countEditionsByParentIds(idPage.getContent(), condition.status());
            return SpiritSearchCountResponse.of(idPage.getTotalElements(), editionCount);
        }
        return SpiritSearchCountResponse.of(
                spiritRepository.countMasters(condition), spiritRepository.countEditions(condition));
    }

    /** 카테고리별 등록 주류 수(에디션 포함) — 메인 홈 사이드바 통계. */
    @Transactional(readOnly = true)
    public List<SpiritCategoryStatResponse> getCategoryStats() {
        return spiritRepository.findCategoryCountsWithEditions().stream()
                .map(row -> SpiritCategoryStatResponse.of(
                        (SpiritCategory) row[0], toCount(row[1]), toCount(row[2])))
                .toList();
    }

    /** SUM(CASE ...) 의 반환 타입은 DB/드라이버마다 Long·BigDecimal 로 갈린다. */
    private long toCount(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
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
        List<SpiritImageResponse> groupImages = groupGalleryImages(spirit);

        List<SpiritVariantResponse> variants = getVariantsResponse(spirit, true);

        return spiritDetailService.buildFullDetailResponse(spirit, images, groupImages, variants);
    }

    /** 관리자 상세 조회 — 상태(ACTIVE/HIDDEN/PENDING) 무관 */
    @Transactional(readOnly = true)
    public SpiritDetailResponse getSpiritDetailForAdmin(Long id) {
        Spirit spirit = spiritRepository.findByIdWithAllDetails(id, null)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        return buildAdminSpiritDetail(spirit);
    }

    @Transactional(readOnly = true)
    public SpiritDetailResponse getSpiritDetailForManager(Long id, Long userId) {
        User user = requireSpiritManagementUser(userId);
        Spirit spirit = spiritRepository.findByIdWithAllDetails(id, null)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        verifyProducerAccess(user, spirit.getProducer());

        return buildAdminSpiritDetail(spirit, user);
    }

    private SpiritDetailResponse buildAdminSpiritDetail(Spirit spirit) {
        return buildAdminSpiritDetail(spirit, null);
    }

    private SpiritDetailResponse buildAdminSpiritDetail(Spirit spirit, User manager) {
        Long id = spirit.getId();

        List<SpiritImage> ownImages = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(id);
        // 관리자 화면은 자기 주류의 이미지만 다루지만, 각 이미지에 어떤 에디션이 지정됐는지는 보여야 한다.
        Map<Long, List<SpiritImageResponse.VariantRef>> refsByImage =
                variantRefsByImage(ownImages, resolveGalleryOwners(spirit));
        List<SpiritImageResponse> images = ownImages.stream()
                .map(image -> SpiritImageResponse.of(
                        image, spirit, refsByImage.getOrDefault(image.getId(), List.of())))
                .toList();

        Map<Long, Spirit> variantsMap = resolveVariants(spirit, false);
        if (manager != null) {
            filterVariantsForManager(variantsMap, manager);
        }
        List<SpiritVariantResponse> variants = buildVariantResponses(variantsMap);

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
     * 에디션 그룹 통합 갤러리 — 마스터 + 모든 ACTIVE 하위 에디션의 이미지를 한 벌로 만든다.
     *
     * <p>정렬은 그룹 안 어느 페이지에서 보든 같다(마스터 먼저, 그다음 에디션 displayOrder 순).
     * 에디션을 바꿔도 썸네일 줄이 재배치되지 않고 선택만 옮겨 가야 하기 때문이다.
     * 어느 에디션 이미지인지는 각 항목의 spiritId·표시명으로 구분한다.
     *
     * <p>소유자는 parent_id 계층만 본다 — {@code resolveVariants} 의 MANUAL 링크 폴백은
     * "다른 제품"이지 같은 그룹의 에디션이 아니다.
     * HIDDEN/PENDING 에디션은 제외한다(삭제는 {@code hide()} 소프트 삭제라 이 필터가 곧 삭제 필터다).
     * 반면 마스터는 상태와 무관하게 포함한다 — 현행 displayImages 폴백과
     * SpiritSeoService.resolveImageUrl 이 모두 부모 상태를 보지 않으므로 동작을 바꾸지 않는다.
     */
    private List<SpiritImageResponse> groupGalleryImages(Spirit spirit) {
        List<Spirit> owners = resolveGalleryOwners(spirit);

        List<SpiritImage> images = spiritImageRepository
                .findBySpiritIdInOrderBySortOrderAscIdAsc(owners.stream().map(Spirit::getId).toList());
        Map<Long, List<SpiritImage>> imagesByOwner = images.stream()
                .collect(Collectors.groupingBy(image -> image.getSpirit().getId()));
        Map<Long, List<SpiritImageResponse.VariantRef>> refsByImage = variantRefsByImage(images, owners);

        List<SpiritImageResponse> result = new ArrayList<>();
        for (Spirit owner : owners) {
            for (SpiritImage image : imagesByOwner.getOrDefault(owner.getId(), List.of())) {
                result.add(SpiritImageResponse.of(
                        image, owner, refsByImage.getOrDefault(image.getId(), List.of())));
            }
        }
        return result;
    }

    /** 그룹 갤러리의 소유자 목록 — 마스터 먼저, 그다음 ACTIVE 에디션(displayOrder 순). */
    private List<Spirit> resolveGalleryOwners(Spirit spirit) {
        Spirit master = resolveGalleryMaster(spirit);

        // findByParentId 가 COALESCE(displayOrder, 999999), id 순으로 정렬해 준다.
        List<Spirit> owners = new ArrayList<>();
        owners.add(master);
        spiritRepository.findByParentId(master.getId()).stream()
                .filter(variant -> variant.getStatus() == SpiritStatus.ACTIVE)
                .forEach(owners::add);
        return owners;
    }

    /**
     * 이미지별 "이 이미지를 쓰는 에디션" 목록.
     *
     * <p>두 경로를 합친다:
     * <ul>
     *   <li>spirit_image_variant 링크 — 마스터에 올린 이미지를 여러 에디션이 함께 쓰는 방식</li>
     *   <li>소유자가 에디션이면 소유자 자신 — 에디션이 직접 이미지를 갖던 예전 데이터 호환</li>
     * </ul>
     * 결과는 owners 순서(마스터 → displayOrder)로 정렬하고 중복은 제거한다.
     * owners 에 없는 에디션(숨김·대기·삭제)을 가리키는 낡은 링크는 여기서 자연히 걸러진다.
     */
    private Map<Long, List<SpiritImageResponse.VariantRef>> variantRefsByImage(
            List<SpiritImage> images, List<Spirit> owners) {
        if (images.isEmpty()) return Map.of();

        // owners 순서를 그대로 쓰려고 LinkedHashMap 으로 만든다.
        LinkedHashMap<Long, Spirit> ownerById = new LinkedHashMap<>();
        owners.forEach(owner -> ownerById.put(owner.getId(), owner));

        Map<Long, Set<Long>> variantIdsByImage = new HashMap<>();
        spiritImageVariantRepository
                .findBySpiritImageIdIn(images.stream().map(SpiritImage::getId).toList())
                .forEach(link -> variantIdsByImage
                        .computeIfAbsent(link.getSpiritImageId(), key -> new HashSet<>())
                        .add(link.getSpiritId()));
        for (SpiritImage image : images) {
            Spirit owner = ownerById.get(image.getSpirit().getId());
            if (owner != null && owner.getParent() != null) {
                variantIdsByImage.computeIfAbsent(image.getId(), key -> new HashSet<>())
                        .add(owner.getId());
            }
        }

        Map<Long, List<SpiritImageResponse.VariantRef>> result = new HashMap<>();
        variantIdsByImage.forEach((imageId, variantIds) -> {
            List<SpiritImageResponse.VariantRef> refs = ownerById.values().stream()
                    .filter(owner -> variantIds.contains(owner.getId()))
                    .map(SpiritImageResponse::variantRefOf)
                    .filter(Objects::nonNull)
                    .toList();
            if (!refs.isEmpty()) result.put(imageId, refs);
        });
        return result;
    }

    /**
     * 갤러리 기준 마스터.
     *
     * <p>findByIdWithAllDetails 는 parent 를 fetch join 하지 않아 프록시로 온다. 표시명 계산이
     * wineDetail 까지 읽으므로, 프록시를 그대로 쓰면 지연 로딩이 두 번 터진다. 한 쿼리로 당겨 온다.
     */
    private Spirit resolveGalleryMaster(Spirit spirit) {
        if (spirit.getParent() == null) {
            return spirit;
        }
        Long masterId = spirit.getParent().getId();
        return spiritRepository.findAllByIdWithCommonAndWineDetail(List.of(masterId)).stream()
                .findFirst()
                .orElse(spirit.getParent());
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

    @Transactional
    public SpiritVariantResponse createUserVariant(Long id, CreateUserVariantRequest request, Long userId) {
        Spirit selected = spiritRepository.findByIdAndStatus(id, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        Spirit master = selected.getParent() != null
                ? spiritRepository.findByIdAndStatus(selected.getParent().getId(), SpiritStatus.ACTIVE)
                    .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND))
                : selected;

        if (master.getCategory() == SpiritCategory.WINE) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        VariantType variantType = resolveVariantTypeForUserCreate(master);
        String seriesIdentifier = resolveSeriesIdentifierForUserCreate(master);
        String seriesIdentifierEn = resolveSeriesIdentifierEnForUserCreate(master, seriesIdentifier);
        if (variantType == null || variantType == VariantType.NONE || !StringUtils.hasText(seriesIdentifier)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String variantValue = request.variantValue().trim();
        Optional<Spirit> duplicate = spiritRepository
                .findByParentIdAndVariantValueIgnoreCaseAndStatusIn(
                        master.getId(),
                        variantValue,
                        List.of(SpiritStatus.ACTIVE, SpiritStatus.PENDING))
                .stream()
                .findFirst();
        if (duplicate.isPresent()) {
            Spirit existing = duplicate.get();
            return SpiritVariantResponse.of(
                    existing,
                    null,
                    SpiritCommonDetailResponse.from(existing.getCommonDetail()),
                    spiritDetailService.buildVariantWhiskyDetail(existing));
        }

        User user = getUser(userId);
        List<Spirit> existingVariants = spiritRepository.findByParentId(master.getId());
        Integer nextDisplayOrder = existingVariants.stream()
                .map(Spirit::getDisplayOrder)
                .filter(order -> order != null)
                .max(Integer::compareTo)
                .map(order -> order + 1)
                .orElse(existingVariants.size());

        Spirit variant = Spirit.builder()
                .nameKo(master.getNameKo())
                .nameEn(master.getNameEn())
                .category(master.getCategory())
                .producer(master.getProducer())
                .vintageYear(master.getVintageYear())
                .abv(master.getAbv())
                .volumeMl(master.getVolumeMl())
                .country(master.getCountry())
                .region(master.getRegion())
                .regionCode(master.getRegionCode())
                .status(SpiritStatus.PENDING)
                .registeredBy(user)
                .parent(master)
                .variantType(variantType)
                .variantValue(variantValue)
                .variantValueEn(normalizeSeriesIdentifier(request.variantValueEn()))
                .seriesIdentifier(seriesIdentifier)
                .seriesIdentifierEn(seriesIdentifierEn)
                .displayOrder(nextDisplayOrder)
                .build();

        Spirit saved = spiritRepository.save(variant);
        return SpiritVariantResponse.of(
                saved,
                null,
                SpiritCommonDetailResponse.from(saved.getCommonDetail()),
                spiritDetailService.buildVariantWhiskyDetail(saved));
    }

    @Transactional(readOnly = true)
    public Page<AdminVariantRequestResponse> getVariantRequestsForAdmin(
            SpiritStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        return spiritRepository.findVariantRequestsForAdmin(status, normalizedKeyword, pageable)
                .map(AdminVariantRequestResponse::from);
    }

    @Transactional
    public AdminVariantRequestResponse approveVariantRequest(Long id) {
        Spirit variant = getVariantRequestTarget(id);
        if (variant.getStatus() != SpiritStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        variant.approve();
        notifyIndexing(variant, variant.getParent());
        return AdminVariantRequestResponse.from(variant);
    }

    @Transactional
    public void rejectVariantRequest(Long id, ModerationRequest moderation) {
        Spirit variant = getVariantRequestTarget(id);
        if (variant.getStatus() != SpiritStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        variant.hide();
        sendLegacyVariantRejectEmailIfNeeded(variant, moderation);
    }

    private void sendLegacyVariantRejectEmailIfNeeded(Spirit variant, ModerationRequest moderation) {
        if (moderation == null || !moderation.shouldSendEmail()) return;
        User requester = variant.getRegisteredBy();
        if (requester == null || !StringUtils.hasText(requester.getEmail())) return;

        String reason = StringUtils.hasText(moderation.reason())
                ? moderation.reason().trim()
                : "운영 정책에 따라 반려되었습니다.";
        String edition = List.of(variant.getSeriesIdentifier(), variant.getVariantValue()).stream()
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" "));
        String body = """
                하위 에디션 요청이 반려되었습니다.

                주류: %s
                에디션: %s
                사유: %s
                """.formatted(
                variant.getParent() != null ? variant.getParent().getNameKo() : variant.getNameKo(),
                StringUtils.hasText(edition) ? edition : "-",
                reason
        );
        try {
            emailSender.send(requester.getEmail(), "[CaskByCask] 하위 에디션 요청 반려 안내", body);
        } catch (Exception e) {
            log.warn("Failed to send legacy variant reject email: to={}", requester.getEmail(), e);
        }
    }

    private List<SpiritVariantResponse> getVariantsResponse(Spirit spirit, boolean activeOnly) {
        return buildVariantResponses(resolveVariants(spirit, activeOnly));
    }

    private List<SpiritVariantResponse> buildVariantResponses(Map<Long, Spirit> variantsMap) {
        if (variantsMap.isEmpty()) return List.of();

        Map<Long, String> primaryImageMap = primaryImageMap(variantsMap.keySet());
        return variantsMap.values().stream()
                .map(v -> SpiritVariantResponse.of(
                        v,
                        primaryImageMap.get(v.getId()),
                        SpiritCommonDetailResponse.from(v.getCommonDetail()),
                        spiritDetailService.buildVariantWhiskyDetail(v),
                        spiritDetailService.buildVariantWineDetail(v)))
                .toList();
    }

    /** 관리자용 연관 술 목록 — 상태 무관(MANUAL 은 HIDDEN 도 포함), 각 항목에 출처(AUTO/MANUAL) 표시. */
    @Transactional(readOnly = true)
    public List<AdminSpiritVariantResponse> getSpiritVariantsForAdmin(Long id) {
        Spirit spirit = spiritRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        Map<Long, Spirit> variants = resolveVariants(spirit, false);
        if (variants.isEmpty()) return List.of();

        Map<Long, String> primaryImageMap = primaryImageMap(variants.keySet());
        return variants.values().stream()
                .map(v -> AdminSpiritVariantResponse.of(
                        v,
                        primaryImageMap.get(v.getId()),
                        "MANUAL"))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminSpiritVariantResponse> getSpiritVariantsForManager(Long id, Long userId) {
        User user = requireSpiritManagementUser(userId);
        Spirit spirit = getSpirit(id);
        verifyProducerAccess(user, spirit.getProducer());

        Map<Long, Spirit> variants = resolveVariants(spirit, false);
        filterVariantsForManager(variants, user);
        if (variants.isEmpty()) return List.of();

        Map<Long, String> primaryImageMap = primaryImageMap(variants.keySet());
        return variants.values().stream()
                .map(v -> AdminSpiritVariantResponse.of(
                        v,
                        primaryImageMap.get(v.getId()),
                        "MANUAL"))
                .toList();
    }

    /** 관리자: 연관 술 수동 추가(양방향). 이미 EXCLUDED 였으면 MANUAL 로 복원. */
    @Transactional
    public void addVariantLink(Long id, Long targetId, Long userId) {
        if (id.equals(targetId)) {
            throw new CustomException(ErrorCode.SPIRIT_VARIANT_SELF_NOT_ALLOWED);
        }
        User user = requireSpiritManagementUser(userId);
        Spirit spirit = getSpirit(id);
        Spirit target = getSpirit(targetId);
        verifyProducerAccess(user, spirit.getProducer());
        verifyProducerAccess(user, target.getProducer());
        upsertLink(id, targetId, VariantLinkType.MANUAL);
    }

    /**
     * 관리자: 연관 술 제거(양방향).
     * 대상이 이름 자동 매치이면 EXCLUDED 로 숨김, 순수 수동이었으면 링크 자체 삭제.
     */
    @Transactional
    public void removeVariantLink(Long id, Long targetId, Long userId) {
        User user = requireSpiritManagementUser(userId);
        Spirit spirit = getSpirit(id);
        Spirit target = getSpirit(targetId);
        verifyProducerAccess(user, spirit.getProducer());
        verifyProducerAccess(user, target.getProducer());
        findLink(id, targetId).ifPresent(variantLinkRepository::delete);
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

        // 2. parent_id 계층이 설정되어 있지 않은 경우에도 이름만으로는 묶지 않고,
        //    관리자가 명시적으로 추가한 수동 링크만 fallback으로 사용한다.
        if (map.isEmpty()) {
            List<SpiritVariantLink> links = variantLinkRepository.findAllInvolving(id);
            Set<Long> excluded = partnerIds(links, id, VariantLinkType.EXCLUDED);
            Set<Long> manual = partnerIds(links, id, VariantLinkType.MANUAL);

            if (!manual.isEmpty()) {
                spiritRepository.findAllByIdWithCommonAndWineDetail(manual).stream()
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

    private VariantType resolveVariantTypeForUserCreate(Spirit master) {
        if (master.getVariantType() != null && master.getVariantType() != VariantType.NONE) {
            return master.getVariantType();
        }
        return spiritRepository.findByParentId(master.getId()).stream()
                .filter(v -> v.getStatus() == SpiritStatus.ACTIVE)
                .map(Spirit::getVariantType)
                .filter(type -> type != null && type != VariantType.NONE)
                .findFirst()
                .orElse(null);
    }

    private String resolveSeriesIdentifierForUserCreate(Spirit master) {
        String direct = normalizeSeriesIdentifier(master.getSeriesIdentifier());
        if (direct != null) return direct;
        return spiritRepository.findByParentId(master.getId()).stream()
                .filter(v -> v.getStatus() == SpiritStatus.ACTIVE)
                .map(Spirit::getSeriesIdentifier)
                .map(this::normalizeSeriesIdentifier)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    private String resolveSeriesIdentifierEnForUserCreate(Spirit master, String fallback) {
        String direct = normalizeSeriesIdentifier(master.getSeriesIdentifierEn());
        if (direct != null) return direct;
        return spiritRepository.findByParentId(master.getId()).stream()
                .filter(v -> v.getStatus() == SpiritStatus.ACTIVE)
                .map(Spirit::getSeriesIdentifierEn)
                .map(this::normalizeSeriesIdentifier)
                .filter(value -> value != null)
                .findFirst()
                .orElse(fallback);
    }

    // ── 관리자 CRUD ─────────────────────────────────────────

    @Transactional
    public SpiritDetailResponse createSpirit(CreateSpiritRequest request, Long userId) {
        User registeredBy = requireSpiritManagementUser(userId);
        Producer producer = resolveProducer(request.producerId());

        // PARTNER는 producerId 미입력 시 자신의 증류소 자동 사용
        if (isProducerScopedRole(registeredBy.getRole()) && producer == null
                && registeredBy.getProducer() != null) {
            producer = registeredBy.getProducer();
        }

        verifyProducerAccess(registeredBy, producer);
        validateEditionValues(request);
        String seriesIdentifier = resolveSeriesIdentifier(request);
        String seriesIdentifierEn = resolveSeriesIdentifierEn(request);
        VariantType masterVariantType = resolveMasterVariantType(request);
        validateVariantSplitSeriesIdentifier(request.isVariantSplit(), masterVariantType, seriesIdentifier);
        validateWineVariants(request.category(), request.isVariantSplit(), request.variants());
        Integer normalizedVintageYear = request.category() == SpiritCategory.WINE
                && Boolean.TRUE.equals(request.isVariantSplit())
                ? null
                : resolveCreateVintageYear(request.category(), request.vintageYear(), request.wineDetail());
        WineRegion regionCode = wineRegionService.resolve(request.regionCode(), request.category());

        Spirit spirit = Spirit.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .category(request.category())
                .producer(producer)
                .vintageYear(normalizedVintageYear)
                .abv(request.abv())
                .volumeMl(request.volumeMl())
                .country(request.country())
                .region(resolveRegionText(regionCode, request.region()))
                .regionCode(regionCode)
                .status(request.status() != null ? request.status() : SpiritStatus.ACTIVE)
                .registeredBy(registeredBy)
                .variantType(masterVariantType)
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
        List<Spirit> indexingTargets = new ArrayList<>();
        if (saved.getStatus() == SpiritStatus.ACTIVE) indexingTargets.add(saved);

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
                        .vintageYear(resolveVariantVintageYear(saved, vReq))
                        .abv(vReq.abv())
                        .volumeMl(vReq.volumeMl())
                        .country(saved.getCountry())
                        .region(saved.getRegion())
                        .regionCode(saved.getRegionCode())
                        .status(request.status() != null ? request.status() : SpiritStatus.ACTIVE)
                        .registeredBy(registeredBy)
                        .parent(saved)
                        .variantType(vReq.variantType())
                        .variantValue(vReq.variantValue())
                        .variantValueEn(vReq.variantValueEn())
                        .seriesIdentifier(resolveVariantSeriesIdentifier(vReq, seriesIdentifier))
                        .seriesIdentifierEn(resolveVariantSeriesIdentifierEn(vReq, seriesIdentifier, seriesIdentifierEn))
                        .abvMin(vReq.abvMin())
                        .abvMax(vReq.abvMax())
                        .volumeMlMin(vReq.volumeMlMin())
                        .volumeMlMax(vReq.volumeMlMax())
                        .displayOrder(i)
                        .build();

                Spirit savedVariant = spiritRepository.save(variant);
                if (savedVariant.getStatus() == SpiritStatus.ACTIVE) indexingTargets.add(savedVariant);
                spiritDetailService.saveCommonDetail(savedVariant, vReq.commonDetail());
                saveVariantCategoryDetail(savedVariant, vReq);
            }
        }

        notifyIndexing(indexingTargets);

        return SpiritDetailResponse.of(saved, List.of());
    }

    @Transactional
    public SpiritDetailResponse updateSpirit(Long id, UpdateSpiritRequest request, Long userId) {
        Spirit spirit = getSpirit(id);
        List<Spirit> indexingTargets = new ArrayList<>();
        indexingTargets.add(spirit);
        User user = requireSpiritManagementUser(userId);

        verifyProducerAccess(user, spirit.getProducer());

        // A manager must not mutate or detach child editions owned by another producer.
        // Load once here and reuse below so the ownership check precedes every mutation.
        List<Spirit> existingVariants = spirit.getParent() == null
                ? spiritRepository.findByParentId(id)
                : List.of();
        if (isProducerScopedRole(user.getRole())) {
            existingVariants.forEach(existing -> verifyProducerAccess(user, existing.getProducer()));
        }

        Producer producer = request.producerId() != null
                ? resolveProducer(request.producerId())
                : spirit.getProducer();
        verifyProducerAccess(user, producer);

        SpiritCategory prevCategory = spirit.getCategory();
        validateEditionValues(request, spirit);
        String seriesIdentifier = resolveSeriesIdentifier(request, spirit);
        String seriesIdentifierEn = resolveSeriesIdentifierEn(request, spirit);
        VariantType masterVariantType = resolveMasterVariantType(request, spirit);
        validateVariantSplitSeriesIdentifier(request.isVariantSplit(), masterVariantType, seriesIdentifier);
        SpiritCategory nextCategory = request.category() != null ? request.category() : spirit.getCategory();
        validateWineVariants(nextCategory, request.isVariantSplit(), request.variants());
        Integer normalizedVintageYear = nextCategory == SpiritCategory.WINE
                && Boolean.TRUE.equals(request.isVariantSplit())
                ? null
                : resolveUpdateVintageYear(spirit, nextCategory, request);
        // 산지 코드는 abvMin/abvMax 와 동일한 규약 — null 이 오면 '해제'로 반영한다(관리자 폼이 항상 필드를 전송).
        WineRegion nextRegionCode = wineRegionService.resolve(request.regionCode(), nextCategory);

        spirit.update(
                request.nameKo() != null ? request.nameKo() : spirit.getNameKo(),
                request.nameEn() != null ? request.nameEn() : spirit.getNameEn(),
                nextCategory,
                producer,
                normalizedVintageYear,
                request.abv() != null ? request.abv() : spirit.getAbv(),
                request.volumeMl() != null ? request.volumeMl() : spirit.getVolumeMl(),
                request.country() != null ? request.country() : spirit.getCountry(),
                resolveRegionText(nextRegionCode,
                        request.region() != null ? request.region() : spirit.getRegion()),
                spirit.getParent(),
                masterVariantType,
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
        spirit.assignRegionCode(nextRegionCode);

        spiritDetailService.saveCommonDetail(spirit, request.commonDetail());
        spiritDetailService.updateCategoryDetail(spirit, prevCategory, request);

        // 하위 에디션 수정 처리 (마스터 주류일 때만 수행)
        if (spirit.getParent() == null) {
            indexingTargets.addAll(existingVariants);
            if (Boolean.TRUE.equals(request.isVariantSplit()) && request.variants() != null) {
                java.util.Set<Long> processedIds = new java.util.HashSet<>();

                List<CreateVariantRequest> variants = request.variants();
                for (int i = 0; i < variants.size(); i++) {
                    CreateVariantRequest vReq = variants.get(i);
                    // 수정 화면은 DB ID 로 기존 에디션을 식별해야 한다. 표시 이름(variantValue)은
                    // 관리자가 바꿀 수 있으므로 이름으로만 대조하면 기존 행을 숨기고 새 행을 만들게 되고,
                    // 기존 리뷰가 숨겨진 옛 에디션에 남아 사용자 화면에서 사라진다.
                    Optional<Spirit> matching;
                    if (vReq.id() != null) {
                        matching = existingVariants.stream()
                                .filter(v -> vReq.id().equals(v.getId()))
                                .findFirst();
                        if (matching.isEmpty() || processedIds.contains(vReq.id())) {
                            // 다른 마스터의 에디션 ID 또는 같은 ID의 중복 전송을 허용하지 않는다.
                            throw new CustomException(ErrorCode.INVALID_INPUT);
                        }
                    } else {
                        // 구버전 클라이언트와 신규 등록 요청은 ID가 없으므로 기존 이름 대조를 유지한다.
                        matching = existingVariants.stream()
                                .filter(v -> v.getVariantValue() != null && v.getVariantValue().equals(vReq.variantValue()))
                                .findFirst();
                    }

                    if (matching.isPresent()) {
                        Spirit existing = matching.get();
                        processedIds.add(existing.getId());
                        // 기존 에디션 정보 업데이트
                        existing.update(
                                spirit.getNameKo(), spirit.getNameEn(), spirit.getCategory(),
                                spirit.getProducer(),
                                resolveVariantVintageYear(spirit, vReq), vReq.abv(), vReq.volumeMl(),
                                spirit.getCountry(), spirit.getRegion(),
                                spirit, vReq.variantType(), vReq.variantValue(), vReq.variantValueEn(),
                                resolveVariantSeriesIdentifier(vReq, seriesIdentifier),
                                resolveVariantSeriesIdentifierEn(vReq, seriesIdentifier, seriesIdentifierEn),
                                vReq.abvMin(), vReq.abvMax(), vReq.volumeMlMin(), vReq.volumeMlMax()
                        );
                        existing.assignDisplayOrder(i);
                        spiritDetailService.saveCommonDetail(existing, vReq.commonDetail());
                        saveVariantCategoryDetail(existing, vReq);
                    } else {
                        // 신규 에디션 추가
                        Spirit variant = Spirit.builder()
                                .nameKo(spirit.getNameKo())
                                .nameEn(spirit.getNameEn())
                                .category(spirit.getCategory())
                                .producer(spirit.getProducer())
                                .vintageYear(resolveVariantVintageYear(spirit, vReq))
                                .abv(vReq.abv())
                                .volumeMl(vReq.volumeMl())
                                .country(spirit.getCountry())
                                .region(spirit.getRegion())
                                .regionCode(spirit.getRegionCode())
                                .status(spirit.getStatus())
                                .registeredBy(user)
                                .parent(spirit)
                                .variantType(vReq.variantType())
                                .variantValue(vReq.variantValue())
                                .variantValueEn(vReq.variantValueEn())
                                .seriesIdentifier(resolveVariantSeriesIdentifier(vReq, seriesIdentifier))
                                .seriesIdentifierEn(resolveVariantSeriesIdentifierEn(vReq, seriesIdentifier, seriesIdentifierEn))
                                .abvMin(vReq.abvMin())
                                .abvMax(vReq.abvMax())
                                .volumeMlMin(vReq.volumeMlMin())
                                .volumeMlMax(vReq.volumeMlMax())
                                .displayOrder(i)
                                .build();

                        Spirit savedVariant = spiritRepository.save(variant);
                        indexingTargets.add(savedVariant);
                        spiritDetailService.saveCommonDetail(savedVariant, vReq.commonDetail());
                        saveVariantCategoryDetail(savedVariant, vReq);
                    }
                }

                // 이번 요청 목록에 포함되지 않은 기존 에디션들은 부모 관계를 해제하고 HIDDEN 처리
                for (Spirit existing : existingVariants) {
                    if (!processedIds.contains(existing.getId())) {
                        existing.update(
                                existing.getNameKo(), existing.getNameEn(), existing.getCategory(),
                                existing.getProducer(),
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
                            existing.getProducer(),
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

        notifyIndexing(indexingTargets);

        indexingTargets.stream().map(Spirit::getId).distinct()
                .forEach(translationCacheInvalidator::invalidateSpirit);

        return SpiritDetailResponse.of(spirit, images);
    }

    @Transactional
    public void deleteSpirit(Long id) {
        Spirit spirit = getSpirit(id);
        spirit.hide();
        translationCacheInvalidator.invalidateSpirit(id);
        notifyIndexing(spirit);
    }

    @Transactional
    public void restoreSpirit(Long id) {
        Spirit spirit = getSpirit(id);
        spirit.activate();
        translationCacheInvalidator.invalidateSpirit(id);
        notifyIndexing(spirit);
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
        // 이 주류가 에디션이었다면, 마스터 이미지에 걸려 있던 지정도 함께 지운다.
        spiritImageVariantRepository.deleteBySpiritId(id);
        translationCacheInvalidator.invalidateSpirit(id);
        spiritRepository.delete(spirit);
        notifyIndexing(spirit);
    }

    // ── 사용자 등록 요청 ────────────────────────────────────

    @Transactional
    public SpiritRegisterRequestResponse submitRegisterRequest(
            SpiritRegisterRequestBody body, List<MultipartFile> images, Long userId) {
        User user = getUser(userId);

        // 카테고리 핵심값 필수 (신청자 제출 경로)
        if (!body.hasCategoryCore()) throw new CustomException(ErrorCode.INVALID_INPUT);
        // 생산 정보(생산자·국가) — 관리자가 승인 화면에서 술을 찾아낼 최소 단서다.
        // 숙성 연수는 더 이상 요구하지 않는다 — 사용자 화면에서 그 입력칸을 없앴다.
        if (!body.hasProductionInfo()) throw new CustomException(ErrorCode.INVALID_INPUT);
        if (!body.hasVariantForTarget()) throw new CustomException(ErrorCode.INVALID_INPUT);
        validateEditionValues(body);
        validateWineVintage(body.category(), body.vintageYear(), body.wineDetail());

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
        return SpiritRegisterRequestDetailResponse.of(
                req, body, resolveProducerName(body), resolveTargetSpirit(body.targetSpiritId()));
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
        // 생산 정보(생산자·국가) — 제출 경로와 같은 기준.
        if (!body.hasProductionInfo()) throw new CustomException(ErrorCode.INVALID_INPUT);
        if (!body.hasVariantForTarget()) throw new CustomException(ErrorCode.INVALID_INPUT);
        validateEditionValues(body);
        validateWineVintage(body.category(), body.vintageYear(), body.wineDetail());

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
        return SpiritRegisterRequestDetailResponse.of(
                req, body, resolveProducerName(body), resolveTargetSpirit(body.targetSpiritId()));
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
        for (String f : List.of("nameKo", "nameEn", "category", "producerId", "producerName", "vintageYear", "abv", "volumeMl", "country", "region", "regionCode",
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
        return SpiritRegisterRequestDetailResponse.of(
                req, mergedBody, resolveProducerName(mergedBody),
                resolveTargetSpirit(mergedBody.targetSpiritId()));
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
        return SpiritRegisterRequestDetailResponse.of(
                req, updated, resolveProducerName(updated),
                resolveTargetSpirit(updated.targetSpiritId()));
    }

    @Transactional
    public SpiritRegisterRequestDetailResponse removeRequestImageUrl(Long requestId, String imageUrl) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        SpiritRegisterRequestBody body = parseSpiritData(req.getSpiritData());

        List<String> imageUrls = new ArrayList<>(body.imageUrls() != null ? body.imageUrls() : List.of());
        imageUrls.remove(imageUrl);

        SpiritRegisterRequestBody updated = withImageUrls(body, imageUrls);
        req.updateSpiritData(serialize(updated));
        return SpiritRegisterRequestDetailResponse.of(
                req, updated, resolveProducerName(updated),
                resolveTargetSpirit(updated.targetSpiritId()));
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
        validateEditionValues(detail);
        String seriesIdentifier = resolveSeriesIdentifier(detail);
        String seriesIdentifierEn = resolveSeriesIdentifierEn(detail);
        VariantType masterVariantType = resolveMasterVariantType(detail);
        validateVariantSplitSeriesIdentifier(detail.isVariantSplit(), masterVariantType, seriesIdentifier);
        validateWineVariants(detail.category(), detail.isVariantSplit(), detail.variants());
        Integer normalizedVintageYear = detail.category() == SpiritCategory.WINE
                && Boolean.TRUE.equals(detail.isVariantSplit())
                ? null
                : resolveCreateVintageYear(detail.category(), detail.vintageYear(), detail.wineDetail());
        WineRegion regionCode = wineRegionService.resolve(detail.regionCode(), detail.category());

        Spirit spirit = Spirit.builder()
                .nameKo(detail.nameKo())
                .nameEn(detail.nameEn())
                .category(detail.category())
                .producer(producer)
                .vintageYear(normalizedVintageYear)
                .abv(detail.abv())
                .volumeMl(detail.volumeMl())
                .country(detail.country())
                .region(resolveRegionText(regionCode, detail.region()))
                .regionCode(regionCode)
                .status(SpiritStatus.ACTIVE)
                .registeredBy(req.getUser())
                .variantType(masterVariantType)
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
        List<Spirit> indexingTargets = new ArrayList<>();
        indexingTargets.add(saved);

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
                        .vintageYear(resolveVariantVintageYear(saved, vReq))
                        .abv(vReq.abv())
                        .volumeMl(vReq.volumeMl())
                        .country(saved.getCountry())
                        .region(saved.getRegion())
                        .regionCode(saved.getRegionCode())
                        .status(SpiritStatus.ACTIVE)
                        .registeredBy(req.getUser())
                        .parent(saved)
                        .variantType(vReq.variantType())
                        .variantValue(vReq.variantValue())
                        .variantValueEn(vReq.variantValueEn())
                        .seriesIdentifier(resolveVariantSeriesIdentifier(vReq, seriesIdentifier))
                        .seriesIdentifierEn(resolveVariantSeriesIdentifierEn(vReq, seriesIdentifier, seriesIdentifierEn))
                        .abvMin(vReq.abvMin())
                        .abvMax(vReq.abvMax())
                        .volumeMlMin(vReq.volumeMlMin())
                        .volumeMlMax(vReq.volumeMlMax())
                        .displayOrder(i)
                        .build();

                Spirit savedVariant = spiritRepository.save(variant);
                indexingTargets.add(savedVariant);
                spiritDetailService.saveCommonDetail(savedVariant, vReq.commonDetail());
                saveVariantCategoryDetail(savedVariant, vReq);
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

        notifyIndexing(indexingTargets);

        return SpiritDetailResponse.of(saved,
                images.stream().map(SpiritImageResponse::from).toList());
    }


    /**
     * 관리자가 등록 요청을 **기존 주류의 하위 에디션**으로 승인한다.
     *
     * <p>신청자가 이미 있는 주류의 새 배치·빈티지를 모르고 새 주류로 올렸을 때, 그대로 승인하면
     * 같은 술의 마스터가 둘이 된다. 관리자가 검토 화면에서 대상 주류를 찾아 이 경로로 승인하면
     * 새 마스터 대신 그 주류의 에디션 1건이 생긴다.
     *
     * <p>{@link #approveRegisterRequestWithDetail} 과 갈라지는 지점은 "무엇을 만드느냐" 뿐이다 —
     * 요청 상태 전이·점수·알림·색인은 같다.
     */
    @Transactional
    public SpiritDetailResponse approveRegisterRequestAsVariant(
            Long requestId, Long targetSpiritId, CreateSpiritRequest detail, Long adminId) {
        SpiritRegisterRequest req = getRegisterRequest(requestId);
        if (req.getStatus() == RequestStatus.APPROVED) {
            throw new CustomException(ErrorCode.SPIRIT_REQUEST_NOT_EDITABLE);
        }
        User admin = getUser(adminId);

        // 관리자가 하위 에디션을 골랐어도 그 부모에 붙인다 — 에디션의 에디션은 없다.
        Spirit selected = spiritRepository.findByIdAndStatus(targetSpiritId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        Spirit master = selected.getParent() != null
                ? spiritRepository.findByIdAndStatus(selected.getParent().getId(), SpiritStatus.ACTIVE)
                    .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND))
                : selected;
        if (master.getCategory() != detail.category()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        // 붙일 에디션은 1건이다. 요청 폼이 1건 고정이고, 관리자가 늘렸더라도 대상은 하나다.
        CreateVariantRequest vReq = (detail.variants() == null || detail.variants().isEmpty())
                ? null
                : detail.variants().get(0);
        if (vReq == null || !StringUtils.hasText(vReq.variantValue())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        // 마스터가 아직 에디션 분리 전이면 이 요청의 값으로 승격한다.
        // createUserVariant 는 여기서 막지만(사용자는 판단 근거가 없다), 관리자는 전체 폼을 보고 확정할 수 있다.
        VariantType variantType = resolveVariantTypeForUserCreate(master);
        if (variantType == null || variantType == VariantType.NONE) variantType = vReq.variantType();
        String seriesIdentifier = resolveSeriesIdentifierForUserCreate(master);
        if (!StringUtils.hasText(seriesIdentifier)) {
            seriesIdentifier = normalizeSeriesIdentifier(detail.seriesIdentifier());
        }
        String seriesIdentifierEn = resolveSeriesIdentifierEnForUserCreate(master, seriesIdentifier);
        if (variantType == null || variantType == VariantType.NONE || !StringUtils.hasText(seriesIdentifier)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (master.getVariantType() == null || master.getVariantType() == VariantType.NONE
                || !StringUtils.hasText(master.getSeriesIdentifier())) {
            master.promoteToVariantMaster(variantType, seriesIdentifier, seriesIdentifierEn);
        }

        // 와인 빈티지는 연도/NV 와 상세가 맞아야 한다 — 기존 검증을 그대로 태운다.
        validateWineVariants(master.getCategory(), Boolean.TRUE, List.of(vReq));

        String variantValue = vReq.variantValue().trim();
        boolean duplicated = !spiritRepository
                .findByParentIdAndVariantValueIgnoreCaseAndStatusIn(
                        master.getId(), variantValue, List.of(SpiritStatus.ACTIVE, SpiritStatus.PENDING))
                .isEmpty();
        if (duplicated) {
            throw new CustomException(ErrorCode.SPIRIT_VARIANT_ALREADY_EXISTS);
        }

        List<Spirit> siblings = spiritRepository.findByParentId(master.getId());
        Integer nextDisplayOrder = siblings.stream()
                .map(Spirit::getDisplayOrder)
                .filter(order -> order != null)
                .max(Integer::compareTo)
                .map(order -> order + 1)
                .orElse(siblings.size());

        Spirit variant = Spirit.builder()
                .nameKo(master.getNameKo())
                .nameEn(master.getNameEn())
                .category(master.getCategory())
                .producer(master.getProducer())
                .vintageYear(resolveVariantVintageYear(master, vReq))
                .abv(vReq.abv())
                .volumeMl(vReq.volumeMl())
                .country(master.getCountry())
                .region(master.getRegion())
                .regionCode(master.getRegionCode())
                .status(SpiritStatus.ACTIVE)
                .registeredBy(req.getUser())
                .parent(master)
                .variantType(variantType)
                .variantValue(variantValue)
                .variantValueEn(normalizeSeriesIdentifier(vReq.variantValueEn()))
                .seriesIdentifier(seriesIdentifier)
                .seriesIdentifierEn(seriesIdentifierEn)
                .abvMin(vReq.abvMin())
                .abvMax(vReq.abvMax())
                .volumeMlMin(vReq.volumeMlMin())
                .volumeMlMax(vReq.volumeMlMax())
                .displayOrder(nextDisplayOrder)
                .build();

        Spirit saved = spiritRepository.save(variant);
        spiritDetailService.saveCommonDetail(saved, vReq.commonDetail());
        saveVariantCategoryDetail(saved, vReq);

        // 신청 이미지는 에디션에 붙인다 — 마스터에는 이미 자기 이미지가 있다.
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

        // [레벨] 술 등록 요청 승인 — 요청자에게 지급 (새 마스터 승인과 같은 대우)
        scoreService.award(req.getUser().getId(), ScoreActions.SPIRIT_REQUEST_APPROVED, "SPIRIT_REQUEST", requestId);

        notificationService.send(
                req.getUser(),
                NotificationType.REQUEST_APPROVED,
                "술 등록 요청 '" + master.getNameKo() + " " + variantValue + "'이(가) 승인되었습니다.",
                "SPIRIT",
                saved.getId()
        );

        notifyIndexing(List.of(master, saved));

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

    private void validateEditionValues(CreateSpiritRequest request) {
        if (!Boolean.TRUE.equals(request.isVariantSplit())) {
            validateEditionValue(request.variantType(), request.variantValue());
        }
        validateVariantEditionValues(request.variants());
    }

    private void validateEditionValues(UpdateSpiritRequest request, Spirit spirit) {
        if (!Boolean.TRUE.equals(request.isVariantSplit())) {
            VariantType variantType = request.variantType() != null
                    ? request.variantType()
                    : spirit.getVariantType();
            String variantValue = request.variantValue() != null ? request.variantValue() : spirit.getVariantValue();
            validateEditionValue(variantType, variantValue);
        }
        validateVariantEditionValues(request.variants());
    }

    private void validateEditionValues(SpiritRegisterRequestBody body) {
        validateEditionValue(body.variantType(), body.variantValue());
    }

    private void validateVariantEditionValues(List<CreateVariantRequest> variants) {
        if (variants == null) return;
        variants.forEach(v -> validateEditionValue(v.variantType(), v.variantValue()));
    }

    /** 와인 하위 항목은 일반 에디션 문자열이 아니라 연도/NV와 상세가 일치해야 한다. */
    private void validateWineVariants(SpiritCategory category, Boolean isVariantSplit,
                                      List<CreateVariantRequest> variants) {
        if (!Boolean.TRUE.equals(isVariantSplit) || variants == null) return;

        Set<String> seen = new java.util.HashSet<>();
        for (CreateVariantRequest variant : variants) {
            if (category != SpiritCategory.WINE) {
                if (variant.variantType() == VariantType.VINTAGE || variant.wineDetail() != null
                        || variant.vintageYear() != null) {
                    throw new CustomException(ErrorCode.INVALID_INPUT);
                }
                continue;
            }

            if (variant.variantType() != VariantType.VINTAGE || variant.wineDetail() == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            WineVintageStatus status = variant.wineDetail().vintageStatus();
            String expectedValue;
            if (status == WineVintageStatus.VINTAGE) {
                Integer year = variant.vintageYear();
                if (year == null || year < SpiritLimits.YEAR_MIN || year > Year.now().getValue()) {
                    throw new CustomException(ErrorCode.INVALID_INPUT);
                }
                expectedValue = year.toString();
            } else if (status == WineVintageStatus.NON_VINTAGE) {
                if (variant.vintageYear() != null) {
                    throw new CustomException(ErrorCode.INVALID_INPUT);
                }
                expectedValue = "NV";
            } else {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            if (!expectedValue.equalsIgnoreCase(variant.variantValue().trim()) || !seen.add(expectedValue)) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        }
    }

    private Integer resolveVariantVintageYear(Spirit master, CreateVariantRequest request) {
        return master.getCategory() == SpiritCategory.WINE ? request.vintageYear() : master.getVintageYear();
    }

    private void saveVariantCategoryDetail(Spirit variant, CreateVariantRequest request) {
        if (variant.getCategory() == SpiritCategory.WHISKY && request.whiskyDetail() != null) {
            spiritDetailService.saveWhiskyDetail(variant, request.whiskyDetail());
        } else if (variant.getCategory() == SpiritCategory.WINE && request.wineDetail() != null) {
            spiritDetailService.saveWineDetail(variant, request.wineDetail());
        }
    }

    private void validateEditionValue(VariantType variantType, String variantValue) {
        if (variantType != null
                && variantType != VariantType.NONE
                && !StringUtils.hasText(variantValue)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private void validateVariantSplitSeriesIdentifier(Boolean isVariantSplit, VariantType variantType, String seriesIdentifier) {
        if (Boolean.TRUE.equals(isVariantSplit)
                && variantType != null
                && variantType != VariantType.NONE
                && !StringUtils.hasText(seriesIdentifier)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private VariantType resolveMasterVariantType(CreateSpiritRequest request) {
        if (Boolean.TRUE.equals(request.isVariantSplit())) {
            if (request.variantType() != null && request.variantType() != VariantType.NONE) {
                return request.variantType();
            }
            if (request.variants() != null && !request.variants().isEmpty()) {
                return request.variants().get(0).variantType();
            }
        }
        return request.variantType();
    }

    private VariantType resolveMasterVariantType(UpdateSpiritRequest request, Spirit spirit) {
        if (Boolean.TRUE.equals(request.isVariantSplit())) {
            if (request.variantType() != null && request.variantType() != VariantType.NONE) {
                return request.variantType();
            }
            if (request.variants() != null && !request.variants().isEmpty()) {
                return request.variants().get(0).variantType();
            }
        }
        return request.variantType() != null ? request.variantType() : spirit.getVariantType();
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

    private String resolveVariantSeriesIdentifier(CreateVariantRequest request, String fallback) {
        String direct = normalizeSeriesIdentifier(request.seriesIdentifier());
        return direct != null ? direct : normalizeSeriesIdentifier(fallback);
    }

    private String resolveVariantSeriesIdentifierEn(CreateVariantRequest request, String seriesIdentifier, String seriesIdentifierEn) {
        String direct = normalizeSeriesIdentifier(request.seriesIdentifierEn());
        if (direct != null) return direct;
        String fallbackEn = normalizeSeriesIdentifier(seriesIdentifierEn);
        return fallbackEn != null ? fallbackEn : resolveVariantSeriesIdentifier(request, seriesIdentifier);
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

    private Spirit getVariantRequestTarget(Long id) {
        Spirit variant = getSpirit(id);
        if (variant.getParent() == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return variant;
    }

    private User getUser(Long userId) {
        return userRepository.getByIdOrThrow(userId);
    }

    @Transactional(readOnly = true)
    public void assertSpiritManagementAccess(Long spiritId, Long userId) {
        requireSpiritForManager(spiritId, userId);
    }

    @Transactional
    public SpiritImageResponse uploadSpiritImageForManager(
            Long spiritId, MultipartFile file, Long userId) {
        requireSpiritForManager(spiritId, userId);
        return spiritImageService.uploadImage(spiritId, file);
    }

    @Transactional
    public void deleteSpiritImageForManager(Long spiritId, Long imageId, Long userId) {
        requireSpiritForManager(spiritId, userId);
        spiritImageService.deleteImage(spiritId, imageId);
    }

    @Transactional
    public SpiritImageResponse setPrimarySpiritImageForManager(
            Long spiritId, Long imageId, Long userId) {
        requireSpiritForManager(spiritId, userId);
        return spiritImageService.setPrimaryImage(spiritId, imageId);
    }

    /**
     * 이미지에 지정할 에디션 집합을 통째로 교체한다.
     *
     * <p>이미지 1장을 여러 에디션이 공유할 수 있다 — 같은 라벨 디자인을 쓰는 배치들이
     * 같은 파일을 중복 업로드하지 않게 하는 것이 이 기능의 목적이다.
     */
    @Transactional
    public SpiritImageResponse assignSpiritImageVariantsForManager(
            Long spiritId, Long imageId, List<Long> variantIds, Long userId) {
        Spirit spirit = requireSpiritForManager(spiritId, userId);
        SpiritImage image = spiritImageRepository.findByIdAndSpiritId(imageId, spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_IMAGE_NOT_FOUND));

        Long masterId = spirit.getParent() != null ? spirit.getParent().getId() : spiritId;
        Set<Long> allowed = spiritRepository.findByParentId(masterId).stream()
                .map(Spirit::getId)
                .collect(Collectors.toSet());

        // 남의 그룹 에디션을 붙이지 못하게 막는다. 중복 입력은 조용히 접는다.
        Set<Long> requested = new LinkedHashSet<>(variantIds != null ? variantIds : List.of());
        if (!allowed.containsAll(requested)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        spiritImageVariantRepository.deleteBySpiritImageId(imageId);
        // 삭제와 삽입이 한 트랜잭션에 있다 — unique 제약에 걸리지 않게 삭제를 먼저 밀어낸다.
        spiritImageVariantRepository.flush();
        if (!requested.isEmpty()) {
            spiritImageVariantRepository.saveAll(requested.stream()
                    .map(variantId -> SpiritImageVariant.of(imageId, variantId))
                    .toList());
        }

        return SpiritImageResponse.of(image, spirit,
                variantRefsByImage(List.of(image), resolveGalleryOwners(spirit))
                        .getOrDefault(imageId, List.of()));
    }

    @Transactional
    public List<SpiritImageResponse> reorderSpiritImagesForManager(
            Long spiritId, List<Long> imageIds, Long userId) {
        requireSpiritForManager(spiritId, userId);
        return spiritImageService.reorderImages(spiritId, imageIds);
    }

    private Spirit requireSpiritForManager(Long spiritId, Long userId) {
        User user = requireSpiritManagementUser(userId);
        Spirit spirit = getSpirit(spiritId);
        verifyProducerAccess(user, spirit.getProducer());
        return spirit;
    }

    private User requireSpiritManagementUser(Long userId) {
        User user = getUser(userId);
        if (isAdminRole(user.getRole())) {
            return user;
        }
        if (isProducerScopedRole(user.getRole())
                && user.getProducer() != null
                && user.getAllowedMenus() != null
                && user.getAllowedMenus().contains(SPIRIT_MANAGEMENT_MENU)) {
            return user;
        }
        throw new CustomException(ErrorCode.SPIRIT_ACCESS_DENIED);
    }

    private SpiritSearchCondition scopeToAssignedProducer(SpiritSearchCondition condition, User user) {
        if (isAdminRole(user.getRole())) {
            return condition;
        }

        Long assignedProducerId = user.getProducer().getId();
        if (condition.producerId() != null && !assignedProducerId.equals(condition.producerId())) {
            throw new CustomException(ErrorCode.SPIRIT_ACCESS_DENIED);
        }

        return new SpiritSearchCondition(
                condition.keyword(), condition.category(), condition.whiskyStyles(), condition.wineTypes(),
                condition.cognacGrades(), condition.country(), condition.region(), assignedProducerId,
                condition.minAbv(), condition.maxAbv(), condition.minScore(), condition.maxScore(),
                condition.status(), condition.sort(), condition.wineSweetness(), condition.wineBody(),
                condition.wineAcidity(), condition.wineTannin());
    }

    private boolean isAdminRole(Role role) {
        return role == Role.SUPER_ADMIN || role == Role.ADMIN;
    }

    private boolean isProducerScopedRole(Role role) {
        return role == Role.PARTNER;
    }

    private boolean hasProducerAccess(User user, Producer producer) {
        return producer != null
                && user.getProducer() != null
                && user.getProducer().getId().equals(producer.getId());
    }

    private void filterVariantsForManager(Map<Long, Spirit> variants, User user) {
        if (isProducerScopedRole(user.getRole())) {
            variants.entrySet().removeIf(entry -> !hasProducerAccess(user, entry.getValue().getProducer()));
        }
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

    private Integer resolveCreateVintageYear(SpiritCategory category,
                                             Integer requestedYear,
                                             WineDetailRequest wineDetail) {
        if (category != SpiritCategory.WINE) {
            return requestedYear;
        }

        WineVintageStatus status = wineDetail != null ? wineDetail.vintageStatus() : null;
        if (status == null) {
            status = requestedYear != null ? WineVintageStatus.VINTAGE : WineVintageStatus.UNKNOWN;
        }
        return normalizeWineVintageYear(status, requestedYear);
    }

    private Integer resolveUpdateVintageYear(Spirit spirit,
                                             SpiritCategory nextCategory,
                                             UpdateSpiritRequest request) {
        if (nextCategory != SpiritCategory.WINE) {
            if (spirit.getCategory() == SpiritCategory.WINE) {
                return null;
            }
            return request.vintageYear() != null ? request.vintageYear() : spirit.getVintageYear();
        }

        WineDetailRequest wineDetail = request.wineDetail();
        if (wineDetail == null) {
            if (request.vintageYear() == null) {
                return spirit.getCategory() == SpiritCategory.WINE ? spirit.getVintageYear() : null;
            }
            return normalizeWineVintageYear(WineVintageStatus.VINTAGE, request.vintageYear());
        }

        WineVintageStatus status = wineDetail.vintageStatus();
        if (status == null && request.vintageYear() != null) {
            status = WineVintageStatus.VINTAGE;
        }
        if (status == null && spirit.getCategory() == SpiritCategory.WINE && spirit.getWineDetail() != null) {
            status = spirit.getWineDetail().getVintageStatus();
        }
        if (status == null) {
            status = request.vintageYear() != null ? WineVintageStatus.VINTAGE : WineVintageStatus.UNKNOWN;
        }

        Integer candidateYear = request.vintageYear();
        if (status == WineVintageStatus.VINTAGE && candidateYear == null
                && spirit.getCategory() == SpiritCategory.WINE) {
            candidateYear = spirit.getVintageYear();
        }
        return normalizeWineVintageYear(status, candidateYear);
    }

    private void validateWineVintage(SpiritCategory category,
                                     Integer requestedYear,
                                     WineDetailRequest wineDetail) {
        resolveCreateVintageYear(category, requestedYear, wineDetail);
    }

    private Integer normalizeWineVintageYear(WineVintageStatus status, Integer requestedYear) {
        if (status != WineVintageStatus.VINTAGE) {
            if (requestedYear != null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            return null;
        }
        if (requestedYear == null || requestedYear < 1800 || requestedYear > Year.now().getValue()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return requestedYear;
    }

    /** 요청이 붙길 기존 주류 요약 — 지워졌거나 숨겨졌으면 null 로 내려 화면이 조용히 새 마스터로 되돌아가게 한다. */
    private SpiritRegisterRequestDetailResponse.TargetSpirit resolveTargetSpirit(Long targetSpiritId) {
        if (targetSpiritId == null) return null;
        return spiritRepository.findByIdAndStatus(targetSpiritId, SpiritStatus.ACTIVE)
                .map(spirit -> new SpiritRegisterRequestDetailResponse.TargetSpirit(
                        spirit.getId(), spirit.getNameKo(), spirit.getNameEn()))
                .orElse(null);
    }

    /**
     * 요청에 실린 생산자 이름 — 등록된 생산자면 그 한글명, 아니면 신청자가 직접 적은 이름.
     *
     * <p>사용자는 목록에 없는 생산자를 승인 대기 큐로만 넣을 수 있어 id 가 없는 경우가 많다.
     * id 만 보고 null 을 내려주면 관리자 검토 화면에 생산자가 빈 칸으로 도착해,
     * 신청자가 분명히 적어 보낸 단서를 관리자가 다시 찾아야 했다.
     */
    private String resolveProducerName(SpiritRegisterRequestBody body) {
        if (body.producerId() != null) {
            String registered = producerRepository.findById(body.producerId())
                    .map(Producer::getNameKo)
                    .orElse(null);
            if (registered != null) return registered;
        }
        String pending = body.producerName();
        return (pending != null && !pending.isBlank()) ? pending.trim() : null;
    }

    private void verifyProducerAccess(User user, Producer producer) {
        if (isAdminRole(user.getRole())) return;
        if (!isProducerScopedRole(user.getRole()) || !hasProducerAccess(user, producer)) {
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
     * 산지 코드가 지정되면 {@code region} 텍스트를 L1 산지명으로 동기화한다.
     *
     * <p>기존 지역 필터({@code GET /api/spirits/regions})·검색·SEO 가 {@code region} 텍스트에 의존하므로
     * 관리자가 산지를 고르면 텍스트도 자동으로 맞춰 이중 입력을 없앤다.
     * L2(예: 메독)를 골라도 필터 버킷은 초보자에게 익숙한 L1(예: 보르도)로 남는다.
     *
     * @param regionCode      해석된 산지 코드 (null 이면 산지 미지정)
     * @param fallbackRegion  산지 미지정 시 사용할 기존/요청 지역 텍스트
     */
    private String resolveRegionText(WineRegion regionCode, String fallbackRegion) {
        return regionCode != null ? regionCode.topLevel().getNameKo() : fallbackRegion;
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

    private void notifyIndexing(List<Spirit> spirits) {
        if (spirits == null || spirits.isEmpty()) return;
        if (spiritIndexingEventPublisher != null) {
            spiritIndexingEventPublisher.publish(spirits);
        }
        notifyProducerIndexing(spirits);
    }

    /** 영향을 받은 생산자를 중복 없이 한 번씩만 통지한다. */
    private void notifyProducerIndexing(List<Spirit> spirits) {
        if (producerIndexingEventPublisher == null) return;
        Set<Long> producerIds = new LinkedHashSet<>();
        for (Spirit spirit : spirits) {
            if (spirit == null || spirit.getProducer() == null) continue;
            // 지연 로딩 프록시라도 식별자 접근은 추가 조회를 일으키지 않는다.
            Long producerId = spirit.getProducer().getId();
            if (producerId != null) producerIds.add(producerId);
        }
        producerIds.forEach(producerIndexingEventPublisher::publish);
    }

    private void notifyIndexing(Spirit... spirits) {
        if (spiritIndexingEventPublisher == null || spirits == null || spirits.length == 0) return;
        List<Spirit> targets = new ArrayList<>();
        for (Spirit spirit : spirits) {
            if (spirit != null) targets.add(spirit);
        }
        notifyIndexing(targets);
    }
}
