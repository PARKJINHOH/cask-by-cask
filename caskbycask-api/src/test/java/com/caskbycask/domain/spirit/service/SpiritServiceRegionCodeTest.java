package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.dto.CreateSpiritRequest;
import com.caskbycask.domain.spirit.dto.CreateVariantRequest;
import com.caskbycask.domain.spirit.dto.SpiritDetailResponse;
import com.caskbycask.domain.spirit.dto.UpdateSpiritRequest;
import com.caskbycask.domain.spirit.dto.WineDetailRequest;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * 산지 코드({@code spirit.region_code}) 저장·상속·동기화 검증.
 *
 * <p>핵심 규약
 * <ul>
 *   <li>산지 코드를 지정하면 {@code region} 텍스트가 L1 산지명으로 자동 동기화된다
 *       (기존 지역 필터·검색·SEO 가 {@code region} 을 쓰기 때문)</li>
 *   <li>수정 시 {@code regionCode == null} 은 '해제'다 (abvMin/abvMax 와 동일한 규약)</li>
 *   <li>에디션(variant)은 마스터의 산지 코드를 상속한다</li>
 *   <li>산지 코드를 보내지 않으면 기존 자유 입력 지역 텍스트를 유지한다</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SpiritServiceRegionCodeTest {

    @Mock private SpiritRepository spiritRepository;
    @Mock private SpiritImageRepository spiritImageRepository;
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

    /** 카탈로그 해석은 실제 동작을 검증해야 하므로 실 구현을 주입한다 */
    @Spy private WineRegionService wineRegionService = new WineRegionService();

    @InjectMocks private SpiritService spiritService;

    @BeforeEach
    void setUp() {
        User admin = User.builder().role(Role.ADMIN).build();
        ReflectionTestUtils.setField(admin, "id", 1L);
        given(userRepository.getByIdOrThrow(1L)).willReturn(admin);
        // save() 는 전달된 엔티티를 그대로 돌려준다 (id 없이도 검증에 충분)
        given(spiritRepository.save(any(Spirit.class))).willAnswer(inv -> inv.getArgument(0));
    }

    // ── 등록 ────────────────────────────────────────────────

    @Test
    @DisplayName("L2 산지를 지정하면 코드가 저장되고 region 텍스트는 L1 산지명으로 동기화된다")
    void createWithL2Region_syncsRegionTextToTopLevel() {
        spiritService.createSpirit(wineRequest("FR_BORDEAUX_MEDOC", "직접입력한지역"), 1L);

        Spirit saved = captureFirstSaved();
        assertThat(saved.getRegionCode()).isEqualTo(WineRegion.FR_BORDEAUX_MEDOC);
        assertThat(saved.getRegion())
                .as("필터 버킷은 초보자에게 익숙한 L1 이름이어야 한다")
                .isEqualTo("보르도");
    }

    @Test
    @DisplayName("L1 산지를 지정하면 region 텍스트가 그 L1 산지명이 된다")
    void createWithL1Region_syncsRegionTextToItself() {
        spiritService.createSpirit(wineRequest("FR_BORDEAUX", null), 1L);

        Spirit saved = captureFirstSaved();
        assertThat(saved.getRegionCode()).isEqualTo(WineRegion.FR_BORDEAUX);
        assertThat(saved.getRegion()).isEqualTo("보르도");
    }

    @Test
    @DisplayName("카탈로그에 없는 산지 코드는 INVALID_INPUT 으로 거부한다")
    void createWithUnknownRegionCode_fails() {
        assertThatThrownBy(() -> spiritService.createSpirit(wineRequest("FR_NOT_A_REGION", null), 1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("회귀: 산지 코드를 안 보내면 regionCode 는 null 이고 region 텍스트는 입력값 그대로 저장된다")
    void createWithoutRegionCode_keepsPlainRegionText() {
        spiritService.createSpirit(whiskyRequest(), 1L);

        Spirit saved = captureFirstSaved();
        assertThat(saved.getRegionCode()).isNull();
        assertThat(saved.getRegion()).isEqualTo("스페이사이드");
        assertThat(saved.getCategory()).isEqualTo(SpiritCategory.WHISKY);
    }

    @Test
    @DisplayName("에디션 분리 등록 시 하위 에디션이 마스터의 산지 코드를 상속한다")
    void createWithVariants_inheritsRegionCode() {
        CreateSpiritRequest request = new CreateSpiritRequest(
                "샤토 마고", "Chateau Margaux", SpiritCategory.WINE, null, 2015,
                null, 750, "프랑스", null, "FR_BORDEAUX_MEDOC",
                null, null, null, null, null,
                true,
                List.of(new CreateVariantRequest(
                        null,
                        VariantType.VINTAGE, "2015", null, "빈티지", "Vintage",
                        null, null, null, 750, null, null, 2015, null, null,
                        new WineDetailRequest(
                                null, WineVintageStatus.VINTAGE, null, null, null, List.of(),
                                null, null, null, null, null, null, null, null, null, null, null, null))),
                null, null, null, null, null, null, null, null, null, SpiritStatus.ACTIVE);

        spiritService.createSpirit(request, 1L);

        ArgumentCaptor<Spirit> captor = ArgumentCaptor.forClass(Spirit.class);
        verify(spiritRepository, org.mockito.Mockito.atLeast(2)).save(captor.capture());
        List<Spirit> all = captor.getAllValues();
        assertThat(all).hasSizeGreaterThanOrEqualTo(2);
        assertThat(all).allSatisfy(s -> {
            assertThat(s.getRegionCode()).isEqualTo(WineRegion.FR_BORDEAUX_MEDOC);
            assertThat(s.getRegion()).isEqualTo("보르도");
        });
    }

    // ── 수정 ────────────────────────────────────────────────

    @Test
    @DisplayName("수정 시 산지 코드를 바꾸면 코드와 region 텍스트가 함께 갱신된다")
    void updateRegionCode_syncsRegionText() {
        Spirit existing = wineSpirit(WineRegion.FR_BORDEAUX_MEDOC, "보르도");
        given(spiritRepository.findById(5L)).willReturn(Optional.of(existing));
        given(spiritRepository.findByParentId(5L)).willReturn(List.of());
        given(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(5L)).willReturn(List.of());

        spiritService.updateSpirit(5L, updateRequestWithRegionCode("IT_PIEMONTE_BAROLO"), 1L);

        assertThat(existing.getRegionCode()).isEqualTo(WineRegion.IT_PIEMONTE_BAROLO);
        assertThat(existing.getRegion()).isEqualTo("피에몬테");
    }

    @Test
    @DisplayName("수정 시 산지 코드 null 은 '해제'로 반영되고 region 텍스트는 기존 값을 유지한다")
    void updateWithNullRegionCode_clearsCode() {
        Spirit existing = wineSpirit(WineRegion.FR_BORDEAUX_MEDOC, "보르도");
        given(spiritRepository.findById(5L)).willReturn(Optional.of(existing));
        given(spiritRepository.findByParentId(5L)).willReturn(List.of());
        given(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(5L)).willReturn(List.of());

        spiritService.updateSpirit(5L, updateRequestWithRegionCode(null), 1L);

        assertThat(existing.getRegionCode()).isNull();
        assertThat(existing.getRegion())
                .as("코드만 해제되고 지역 텍스트는 남는다 — 기존 필터 결과가 갑자기 비지 않도록")
                .isEqualTo("보르도");
    }

    @Test
    @DisplayName("수정 시 잘못된 산지 코드는 INVALID_INPUT 으로 거부하고 기존 값을 바꾸지 않는다")
    void updateWithUnknownRegionCode_fails() {
        Spirit existing = wineSpirit(WineRegion.FR_BORDEAUX_MEDOC, "보르도");
        given(spiritRepository.findById(5L)).willReturn(Optional.of(existing));
        given(spiritRepository.findByParentId(5L)).willReturn(List.of());

        assertThatThrownBy(() -> spiritService.updateSpirit(5L, updateRequestWithRegionCode("BOGUS"), 1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        assertThat(existing.getRegionCode()).isEqualTo(WineRegion.FR_BORDEAUX_MEDOC);
    }

    // ── 응답 ────────────────────────────────────────────────

    @Test
    @DisplayName("상세 응답의 wineRegion 은 선택값과 상위 L1 을 함께 담는다")
    void detailResponseExposesRegionAndParent() {
        SpiritDetailResponse response = SpiritDetailResponse.of(
                wineSpirit(WineRegion.FR_BORDEAUX_MEDOC, "보르도"), List.of());

        assertThat(response.wineRegion()).isNotNull();
        assertThat(response.wineRegion().code()).isEqualTo("FR_BORDEAUX_MEDOC");
        assertThat(response.wineRegion().countryCode()).isEqualTo("FR");
        assertThat(response.wineRegion().nameKo()).isEqualTo("메독");
        assertThat(response.wineRegion().nameEn()).isEqualTo("Médoc");
        assertThat(response.wineRegion().parentCode()).isEqualTo("FR_BORDEAUX");
        assertThat(response.wineRegion().parentNameKo()).isEqualTo("보르도");
    }

    @Test
    @DisplayName("L1 만 선택된 경우 상위 정보는 null 이다 (확대 패널 생략 신호)")
    void detailResponseHasNoParentForTopLevel() {
        SpiritDetailResponse response = SpiritDetailResponse.of(
                wineSpirit(WineRegion.FR_BORDEAUX, "보르도"), List.of());

        assertThat(response.wineRegion().code()).isEqualTo("FR_BORDEAUX");
        assertThat(response.wineRegion().parentCode()).isNull();
        assertThat(response.wineRegion().parentNameKo()).isNull();
    }

    @Test
    @DisplayName("산지 미지정 주류의 상세 응답에는 wineRegion 이 없다")
    void detailResponseOmitsRegionWhenAbsent() {
        SpiritDetailResponse response = SpiritDetailResponse.of(wineSpirit(null, "스페이사이드"), List.of());

        assertThat(response.wineRegion()).isNull();
        assertThat(response.region()).isEqualTo("스페이사이드");
    }

    // ── 헬퍼 ────────────────────────────────────────────────

    private Spirit captureFirstSaved() {
        ArgumentCaptor<Spirit> captor = ArgumentCaptor.forClass(Spirit.class);
        verify(spiritRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        return captor.getAllValues().get(0);
    }

    private Spirit wineSpirit(WineRegion regionCode, String regionText) {
        Spirit spirit = Spirit.builder()
                .nameKo("테스트 와인").nameEn("Test Wine")
                .category(SpiritCategory.WINE)
                .country("프랑스")
                .region(regionText)
                .regionCode(regionCode)
                .build();
        ReflectionTestUtils.setField(spirit, "id", 5L);
        return spirit;
    }

    private CreateSpiritRequest wineRequest(String regionCode, String regionText) {
        return new CreateSpiritRequest(
                "샤토 마고", "Chateau Margaux", SpiritCategory.WINE, null, 2015,
                null, 750, "프랑스", regionText, regionCode,
                null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null,
                SpiritStatus.ACTIVE);
    }

    private CreateSpiritRequest whiskyRequest() {
        return new CreateSpiritRequest(
                "맥캘란 12", "Macallan 12", SpiritCategory.WHISKY, null, null,
                null, 700, "영국", "스페이사이드", null,
                null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null,
                SpiritStatus.ACTIVE);
    }

    private UpdateSpiritRequest updateRequestWithRegionCode(String regionCode) {
        // 인자 순서: nameKo, nameEn, category, producerId, vintageYear, abv, volumeMl,
        //           country, region, regionCode, commonDetail, ... (총 26개)
        return new UpdateSpiritRequest(
                null, null, null, null, null, null, null, null, null,
                regionCode,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null);
    }
}
