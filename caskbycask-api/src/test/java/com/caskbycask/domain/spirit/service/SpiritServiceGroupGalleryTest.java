package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.dto.SpiritImageResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.SpiritImageVariant;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritImageVariantRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.translation.service.TranslationCacheInvalidator;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

/**
 * 상세 갤러리(groupImages) — 마스터 + ACTIVE 하위 에디션 이미지를 한 벌로 묶는 로직.
 *
 * <p>기존 images(본인 → 마스터 폴백)는 SEO·리뷰 공유 카드가 대표 이미지를 고를 때 쓰므로
 * 계약이 변하면 안 된다. 그 회귀도 함께 막는다.
 */
@ExtendWith(MockitoExtension.class)
class SpiritServiceGroupGalleryTest {

    @Mock private SpiritRepository spiritRepository;
    @Mock private SpiritImageRepository spiritImageRepository;
    @Mock private SpiritImageVariantRepository spiritImageVariantRepository;
    @Mock private SpiritVariantLinkRepository variantLinkRepository;
    @Mock private SpiritRegisterRequestRepository registerRequestRepository;
    @Mock private ProducerRepository producerRepository;
    @Mock private UserRepository userRepository;
    @Mock private ObjectMapper objectMapper;
    @Mock private SpiritDetailService spiritDetailService;
    @Mock private SpiritImageService spiritImageService;
    @Mock private ScoreService scoreService;
    @Mock private NotificationService notificationService;
    @Mock private BadWordFilter badWordFilter;
    @Mock private SpiritSearchService spiritSearchService;
    @Mock private EmailSender emailSender;
    @Mock private TranslationCacheInvalidator translationCacheInvalidator;

    @InjectMocks private SpiritService spiritService;

    @Captor private ArgumentCaptor<List<SpiritImageResponse>> imagesCaptor;
    @Captor private ArgumentCaptor<List<SpiritImageResponse>> groupImagesCaptor;
    @Captor private ArgumentCaptor<List<Long>> ownerIdsCaptor;

    @Test
    @DisplayName("마스터 페이지: 마스터와 모든 ACTIVE 에디션 이미지를 마스터 → 에디션 순으로 합친다")
    void masterPageReturnsWholeGroup() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);
        Spirit editionB = edition(3L, master, "배치 12", "Batch 12", 1, SpiritStatus.ACTIVE);

        givenDetail(master);
        givenVariants(1L, editionA, editionB);
        givenGroupImages(
                image(10L, master, "/m1.webp", true, 0),
                image(11L, master, "/m2.webp", false, 1),
                image(20L, editionA, "/a.webp", true, 0),
                image(30L, editionB, "/b.webp", true, 0));
        givenOwnImages(1L,
                image(10L, master, "/m1.webp", true, 0),
                image(11L, master, "/m2.webp", false, 1));

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages())
                .extracting(SpiritImageResponse::imageUrl, SpiritImageResponse::spiritId)
                .containsExactly(
                        tuple("/m1.webp", 1L),
                        tuple("/m2.webp", 1L),
                        tuple("/a.webp", 2L),
                        tuple("/b.webp", 3L));
    }

    @Test
    @DisplayName("에디션 페이지: 갤러리 목록과 순서가 마스터 페이지와 완전히 같다")
    void editionPageReturnsSameGroupInSameOrder() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);
        Spirit editionB = edition(3L, master, "배치 12", "Batch 12", 1, SpiritStatus.ACTIVE);

        givenDetail(editionA);
        givenGalleryMaster(master);
        givenVariants(1L, editionA, editionB);
        givenGroupImages(
                image(10L, master, "/m1.webp", true, 0),
                image(20L, editionA, "/a.webp", true, 0),
                image(30L, editionB, "/b.webp", true, 0));
        givenOwnImages(2L, image(20L, editionA, "/a.webp", true, 0));

        spiritService.getSpiritDetail(2L);

        assertThat(captureGroupImages())
                .extracting(SpiritImageResponse::imageUrl)
                .containsExactly("/m1.webp", "/a.webp", "/b.webp");
    }

    @Test
    @DisplayName("마스터 이미지 1장을 여러 에디션이 함께 쓴다 — 지정 순서는 displayOrder 를 따른다")
    void oneImageCanBeSharedBySeveralEditions() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);
        Spirit editionB = edition(3L, master, "배치 12", "Batch 12", 1, SpiritStatus.ACTIVE);

        givenDetail(master);
        givenVariants(1L, editionA, editionB);
        givenGroupImages(image(10L, master, "/m.webp", true, 0));
        givenOwnImages(1L, image(10L, master, "/m.webp", true, 0));
        // 링크는 순서를 보장하지 않는다 — B 를 먼저 넣어도 displayOrder 순으로 나와야 한다.
        givenAssignments(link(10L, 3L), link(10L, 2L));

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages().get(0).variants())
                .extracting(SpiritImageResponse.VariantRef::spiritId,
                        SpiritImageResponse.VariantRef::variantValue,
                        SpiritImageResponse.VariantRef::variantValueEn)
                .containsExactly(
                        tuple(2L, "배치 11", "Batch 11"),
                        tuple(3L, "배치 12", "Batch 12"));
    }

    @Test
    @DisplayName("지정이 없는 이미지는 공통 이미지 — variants 가 비어 뱃지가 뜨지 않는다")
    void unassignedImageIsShared() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);

        givenDetail(master);
        givenVariants(1L, editionA);
        givenGroupImages(image(10L, master, "/m.webp", true, 0));
        givenOwnImages(1L, image(10L, master, "/m.webp", true, 0));
        givenAssignments();

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages().get(0).variants()).isEmpty();
    }

    @Test
    @DisplayName("에디션이 직접 소유한 예전 이미지는 소유 에디션이 암묵적으로 지정된다")
    void editionOwnedImageKeepsImplicitSelfAssignment() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);

        givenDetail(master);
        givenVariants(1L, editionA);
        givenGroupImages(image(20L, editionA, "/a.webp", true, 0));
        givenOwnImages(1L);
        givenAssignments();

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages().get(0).variants())
                .extracting(SpiritImageResponse.VariantRef::spiritId)
                .containsExactly(2L);
    }

    @Test
    @DisplayName("소유와 링크가 겹쳐도 같은 에디션이 두 번 실리지 않는다")
    void ownerAndLinkDoNotDuplicate() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);

        givenDetail(master);
        givenVariants(1L, editionA);
        givenGroupImages(image(20L, editionA, "/a.webp", true, 0));
        givenOwnImages(1L);
        givenAssignments(link(20L, 2L));

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages().get(0).variants())
                .extracting(SpiritImageResponse.VariantRef::spiritId)
                .containsExactly(2L);
    }

    @Test
    @DisplayName("숨김·삭제된 에디션을 가리키는 낡은 링크는 무시한다")
    void staleLinkToInactiveEditionIsIgnored() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit active = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);
        Spirit hidden = edition(3L, master, "배치 12", "Batch 12", 1, SpiritStatus.HIDDEN);

        givenDetail(master);
        givenVariants(1L, active, hidden);
        givenGroupImages(image(10L, master, "/m.webp", true, 0));
        givenOwnImages(1L, image(10L, master, "/m.webp", true, 0));
        // 3L(숨김)과 999L(삭제됨) 링크는 살아 있는 에디션 목록에 없어 걸러진다.
        givenAssignments(link(10L, 2L), link(10L, 3L), link(10L, 999L));

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages().get(0).variants())
                .extracting(SpiritImageResponse.VariantRef::spiritId)
                .containsExactly(2L);
    }

    @Test
    @DisplayName("에디션 유형이 NONE 이면 지정돼 있어도 뱃지용 참조를 만들지 않는다")
    void variantTypeNoneCarriesNoRef() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);
        ReflectionTestUtils.setField(editionA, "variantType", VariantType.NONE);

        givenDetail(master);
        givenVariants(1L, editionA);
        givenGroupImages(image(10L, master, "/m.webp", true, 0));
        givenOwnImages(1L, image(10L, master, "/m.webp", true, 0));
        givenAssignments(link(10L, 2L));

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages().get(0).variants()).isEmpty();
    }

    @Test
    @DisplayName("HIDDEN·PENDING 에디션은 조회 대상에서부터 빠진다")
    void hiddenAndPendingEditionsAreExcluded() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit active = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);
        Spirit hidden = edition(3L, master, "배치 12", "Batch 12", 1, SpiritStatus.HIDDEN);
        Spirit pending = edition(4L, master, "배치 13", "Batch 13", 2, SpiritStatus.PENDING);

        givenDetail(master);
        givenVariants(1L, active, hidden, pending);
        givenGroupImages(
                image(10L, master, "/m.webp", true, 0),
                image(20L, active, "/a.webp", true, 0));
        givenOwnImages(1L, image(10L, master, "/m.webp", true, 0));

        spiritService.getSpiritDetail(1L);

        // 숨김(=소프트 삭제)·대기 에디션은 이미지 조회 ID 목록에 아예 들어가지 않는다.
        verify(spiritImageRepository).findBySpiritIdInOrderBySortOrderAscIdAsc(ownerIdsCaptor.capture());
        assertThat(ownerIdsCaptor.getValue()).containsExactly(1L, 2L);
        assertThat(captureGroupImages())
                .extracting(SpiritImageResponse::imageUrl)
                .containsExactly("/m.webp", "/a.webp");
    }

    @Test
    @DisplayName("마스터가 HIDDEN 이어도 마스터 이미지는 포함한다 (기존 폴백 동작 유지)")
    void hiddenMasterImagesStayVisibleOnEditionPage() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        ReflectionTestUtils.setField(master, "status", SpiritStatus.HIDDEN);
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);

        givenDetail(editionA);
        givenGalleryMaster(master);
        givenVariants(1L, editionA);
        givenGroupImages(
                image(10L, master, "/m.webp", true, 0),
                image(20L, editionA, "/a.webp", true, 0));
        givenOwnImages(2L, image(20L, editionA, "/a.webp", true, 0));

        spiritService.getSpiritDetail(2L);

        assertThat(captureGroupImages())
                .extracting(SpiritImageResponse::imageUrl)
                .containsExactly("/m.webp", "/a.webp");
    }

    @Test
    @DisplayName("에디션 없는 단독 주류는 본인 이미지만 나온다")
    void standaloneSpiritReturnsOwnImagesOnly() {
        Spirit standalone = whisky(1L, "라가불린 16년", "Lagavulin 16");

        givenDetail(standalone);
        givenVariants(1L);
        givenGroupImages(image(10L, standalone, "/s.webp", true, 0));
        givenOwnImages(1L, image(10L, standalone, "/s.webp", true, 0));

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages())
                .extracting(SpiritImageResponse::imageUrl, SpiritImageResponse::spiritId)
                .containsExactly(tuple("/s.webp", 1L));
    }

    @Test
    @DisplayName("그룹 전체에 이미지가 없으면 빈 목록을 반환한다")
    void emptyGroupReturnsEmptyList() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);

        givenDetail(master);
        givenVariants(1L, editionA);
        givenGroupImages();
        givenOwnImages(1L);

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages()).isEmpty();
    }

    @Test
    @DisplayName("images 는 기존 계약(본인 → 마스터 폴백)을 그대로 유지한다")
    void imagesFieldKeepsOwnThenParentFallback() {
        Spirit master = whisky(1L, "아드벡 우가달", "Ardbeg Uigeadail");
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0, SpiritStatus.ACTIVE);

        givenDetail(editionA);
        givenGalleryMaster(master);
        givenVariants(1L, editionA);
        givenGroupImages(image(10L, master, "/m.webp", true, 0));
        // 에디션 자체 이미지는 없다 → images 는 마스터 이미지로 폴백해야 한다.
        givenOwnImages(2L);
        givenOwnImages(1L, image(10L, master, "/m.webp", true, 0));

        spiritService.getSpiritDetail(2L);

        verify(spiritDetailService).buildFullDetailResponse(
                any(Spirit.class), imagesCaptor.capture(), groupImagesCaptor.capture(), anyList());
        assertThat(imagesCaptor.getValue())
                .extracting(SpiritImageResponse::imageUrl)
                .containsExactly("/m.webp");
    }

    @Test
    @DisplayName("와인 빈티지는 지정 참조의 식별 값이 연도가 된다")
    void wineVintageCarriesYearAsVariantValue() {
        Spirit master = wine(1L, "샤토 마고", "Chateau Margaux");
        Spirit vintage = wine(2L, "샤토 마고", "Chateau Margaux");
        ReflectionTestUtils.setField(vintage, "parent", master);
        ReflectionTestUtils.setField(vintage, "variantType", VariantType.VINTAGE);
        ReflectionTestUtils.setField(vintage, "variantValue", "2015");
        ReflectionTestUtils.setField(vintage, "vintageYear", 2015);
        ReflectionTestUtils.setField(vintage, "displayOrder", 0);

        givenDetail(master);
        givenVariants(1L, vintage);
        givenGroupImages(image(20L, vintage, "/v.webp", true, 0));
        givenOwnImages(1L);

        spiritService.getSpiritDetail(1L);

        assertThat(captureGroupImages().get(0).variants())
                .extracting(SpiritImageResponse.VariantRef::variantValue)
                .containsExactly("2015");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<SpiritImageResponse> captureGroupImages() {
        verify(spiritDetailService).buildFullDetailResponse(
                any(Spirit.class), anyList(), groupImagesCaptor.capture(), anyList());
        return groupImagesCaptor.getValue();
    }

    private void givenDetail(Spirit spirit) {
        given(spiritRepository.findByIdWithAllDetails(spirit.getId(), SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
    }

    /** 에디션 페이지에서 마스터는 fetch join 쿼리로 따로 당겨 온다(프록시 지연 로딩 회피). */
    private void givenGalleryMaster(Spirit master) {
        given(spiritRepository.findAllByIdWithCommonAndWineDetail(List.of(master.getId())))
                .willReturn(List.of(master));
    }

    /** findByParentId 는 리포지토리 쿼리가 displayOrder·id 순으로 정렬해 돌려준다. */
    private void givenVariants(Long masterId, Spirit... variants) {
        given(spiritRepository.findByParentId(masterId)).willReturn(List.of(variants));
        lenient().when(variantLinkRepository.findAllInvolving(anyLong())).thenReturn(List.of());
        lenient().when(spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(anyList()))
                .thenReturn(List.of());
        // 지정이 없는 상태가 기본 — 필요한 테스트는 givenAssignments 로 덮어쓴다.
        lenient().when(spiritImageVariantRepository.findBySpiritImageIdIn(any()))
                .thenReturn(List.of());
    }

    /** 지정(링크) 스텁. 인자가 없으면 지정 없음 = 공통 이미지. */
    private void givenAssignments(SpiritImageVariant... links) {
        lenient().when(spiritImageVariantRepository.findBySpiritImageIdIn(any()))
                .thenReturn(List.of(links));
    }

    private SpiritImageVariant link(Long imageId, Long variantId) {
        return SpiritImageVariant.of(imageId, variantId);
    }

    private void givenGroupImages(SpiritImage... images) {
        given(spiritImageRepository.findBySpiritIdInOrderBySortOrderAscIdAsc(anyList()))
                .willReturn(List.of(images));
    }

    private void givenOwnImages(Long spiritId, SpiritImage... images) {
        lenient().when(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId))
                .thenReturn(List.of(images));
    }

    private Spirit whisky(Long id, String nameKo, String nameEn) {
        return spirit(id, nameKo, nameEn, SpiritCategory.WHISKY);
    }

    private Spirit wine(Long id, String nameKo, String nameEn) {
        return spirit(id, nameKo, nameEn, SpiritCategory.WINE);
    }

    private Spirit spirit(Long id, String nameKo, String nameEn, SpiritCategory category) {
        Spirit spirit = Spirit.builder()
                .nameKo(nameKo).nameEn(nameEn)
                .category(category)
                .status(SpiritStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }

    private Spirit edition(Long id, Spirit master, String value, String valueEn,
                           int displayOrder, SpiritStatus status) {
        Spirit spirit = whisky(id, master.getNameKo(), master.getNameEn());
        ReflectionTestUtils.setField(spirit, "status", status);
        ReflectionTestUtils.setField(spirit, "parent", master);
        ReflectionTestUtils.setField(spirit, "variantType", VariantType.BATCH);
        ReflectionTestUtils.setField(spirit, "variantValue", value);
        ReflectionTestUtils.setField(spirit, "variantValueEn", valueEn);
        ReflectionTestUtils.setField(spirit, "displayOrder", displayOrder);
        return spirit;
    }

    private SpiritImage image(Long id, Spirit owner, String url, boolean primary, int sortOrder) {
        SpiritImage image = SpiritImage.builder()
                .spirit(owner).imageUrl(url).isPrimary(primary).sortOrder(sortOrder).build();
        ReflectionTestUtils.setField(image, "id", id);
        return image;
    }
}
