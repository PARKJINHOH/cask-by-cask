package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.CognacDetailRequest;
import com.caskbycask.domain.spirit.dto.CreateSpiritRequest;
import com.caskbycask.domain.spirit.dto.CruCompositionRequest;
import com.caskbycask.domain.spirit.dto.SpiritDetailResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritCognacDetail;
import com.caskbycask.domain.spirit.entity.enums.CognacCru;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.CognacOakType;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.repository.*;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * 꼬냑 상세 저장·조회 검증.
 *
 * <p>핵심 규약
 * <ul>
 *   <li>꼬냑은 여러 크뤼를 섞는 아상블라주가 기본이라 크뤼를 <b>구성(복수)</b>으로 기록한다.
 *       '블렌드'는 별도 필드가 아니라 구성 개수에서 파생한다</li>
 *   <li>{@code spirit_cognac_detail.cru} 컬럼은 <b>대표 크뤼</b> — 구성 중 비율 최상위로 서버가 정한다
 *       (cru 만 보는 기존 소비처를 살리기 위함)</li>
 *   <li>구성·오크는 {@code extra_data} JSON 에 들어간다. 단수 {@code oakType} 만 있던
 *       과거 행은 1개짜리 배열로 승격시켜 읽는다</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SpiritDetailServiceCognacTest {

    @Mock SpiritCommonDetailRepository commonDetailRepo;
    @Mock SpiritWhiskyDetailRepository whiskyDetailRepo;
    @Mock SpiritWineDetailRepository   wineDetailRepo;
    @Mock SpiritCognacDetailRepository cognacDetailRepo;
    @Mock SpiritOtherDetailRepository  otherDetailRepo;
    @Spy  ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks SpiritDetailService service;

    // ── 저장 ────────────────────────────────────────────────

    @Test
    @DisplayName("크뤼 구성을 extra_data 에 저장하고 대표 크뤼는 비율 최상위로 정한다")
    void saveCruCompositionAndPickRepresentativeCru() {
        // Hennessy XO — 4개 크뤼 블렌드
        SpiritCognacDetail saved = saveCognac(request(
                CognacGrade.XO,
                List.of(
                        cru(CognacCru.PETITE_CHAMPAGNE, 20),
                        cru(CognacCru.GRANDE_CHAMPAGNE, 40),
                        cru(CognacCru.BORDERIES, 15),
                        cru(CognacCru.FINS_BOIS, 25)
                ),
                List.of(CognacOakType.LIMOUSIN, CognacOakType.TRONCAIS)));

        assertThat(saved.getGrade()).isEqualTo(CognacGrade.XO);
        assertThat(saved.getCru()).isEqualTo(CognacCru.GRANDE_CHAMPAGNE);
        assertThat(saved.getExtraData())
                .contains("\"cru\":\"GRANDE_CHAMPAGNE\"")
                .contains("\"percentage\":40")
                .contains("\"oakTypes\":[\"LIMOUSIN\",\"TRONCAIS\"]");
    }

    @Test
    @DisplayName("비율이 전부 미상이면 첫 번째 크뤼가 대표가 된다")
    void firstCruWinsWhenNoPercentages() {
        SpiritCognacDetail saved = saveCognac(request(
                CognacGrade.VSOP,
                List.of(cru(CognacCru.FINS_BOIS, null), cru(CognacCru.BONS_BOIS, null)),
                null));

        assertThat(saved.getCru()).isEqualTo(CognacCru.FINS_BOIS);
    }

    @Test
    @DisplayName("Extra 등급으로 등록할 수 있다")
    void saveExtraGrade() {
        // Rémy Martin Extra 처럼 법정 숙성연수가 없는 하우스 표기
        SpiritCognacDetail saved = saveCognac(request(CognacGrade.EXTRA, null, null));

        assertThat(saved.getGrade()).isEqualTo(CognacGrade.EXTRA);
    }

    @Test
    @DisplayName("구성을 보내지 않으면 요청의 단일 크뤼를 그대로 쓴다")
    void keepsSingleCruWhenNoComposition() {
        CognacDetailRequest req = new CognacDetailRequest(
                CognacGrade.XO, CognacCru.BORDERIES, null, null,
                null, null, null, null, null, null);

        assertThat(saveCognac(req).getCru()).isEqualTo(CognacCru.BORDERIES);
    }

    @Test
    @DisplayName("크뤼 비율 합계가 100%를 넘으면 거부한다")
    void rejectsCruPercentageOverHundred() {
        CognacDetailRequest req = request(CognacGrade.XO, List.of(
                cru(CognacCru.GRANDE_CHAMPAGNE, 60),
                cru(CognacCru.PETITE_CHAMPAGNE, 50)), null);

        assertThatThrownBy(() -> service.saveCategoryDetail(cognacSpirit(), createRequest(req)))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_CRU_PERCENTAGE);
    }

    @Test
    @DisplayName("같은 크뤼를 중복 입력하면 거부한다")
    void rejectsDuplicateCru() {
        CognacDetailRequest req = request(CognacGrade.XO, List.of(
                cru(CognacCru.GRANDE_CHAMPAGNE, 50),
                cru(CognacCru.GRANDE_CHAMPAGNE, 30)), null);

        assertThatThrownBy(() -> service.saveCategoryDetail(cognacSpirit(), createRequest(req)))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_CRU_COMPOSITION);
    }

    // ── 조회 ────────────────────────────────────────────────

    @Test
    @DisplayName("저장한 크뤼 구성·오크가 응답에 그대로 돌아온다")
    void cruCompositionRoundTrips() {
        SpiritCognacDetail saved = saveCognac(request(
                CognacGrade.XO,
                List.of(cru(CognacCru.GRANDE_CHAMPAGNE, 60), cru(CognacCru.BORDERIES, 40)),
                List.of(CognacOakType.LIMOUSIN)));

        var cognac = buildResponse(saved).cognacDetail();

        assertThat(cognac.cruComposition())
                .extracting(c -> c.cru().name() + ":" + c.percentage())
                .containsExactly("GRANDE_CHAMPAGNE:60", "BORDERIES:40");
        assertThat(cognac.oakTypes()).containsExactly(CognacOakType.LIMOUSIN);
        assertThat(cognac.cru()).isEqualTo(CognacCru.GRANDE_CHAMPAGNE);
    }

    @Test
    @DisplayName("싱글 크뤼는 구성 1줄로 내려간다 — 화면이 여기서 '싱글 크뤼'를 파생한다")
    void singleCruHasOneRow() {
        // Frapin — 100% Grande Champagne
        SpiritCognacDetail saved = saveCognac(request(
                CognacGrade.EXTRA, List.of(cru(CognacCru.GRANDE_CHAMPAGNE, 100)), null));

        assertThat(buildResponse(saved).cognacDetail().cruComposition()).hasSize(1);
    }

    @Test
    @DisplayName("구버전 행: 단수 oakType 문자열을 1개짜리 배열로 승격시켜 읽는다")
    void legacySingularOakTypeIsPromoted() {
        SpiritCognacDetail legacy = detail(CognacGrade.VSOP, CognacCru.FINS_BOIS,
                "{\"blendDetail\":null,\"oakType\":\"TRONCAIS\",\"caskFinish\":null}");

        assertThat(buildResponse(legacy).cognacDetail().oakTypes())
                .containsExactly(CognacOakType.TRONCAIS);
    }

    @Test
    @DisplayName("구버전 행: 구성이 없으면 cru 컬럼을 1줄짜리 구성으로 승격시킨다")
    void legacyCruColumnIsPromotedToComposition() {
        SpiritCognacDetail legacy = detail(CognacGrade.XO, CognacCru.BORDERIES,
                "{\"blendDetail\":\"카뮈 보르드리\"}");

        var composition = buildResponse(legacy).cognacDetail().cruComposition();

        assertThat(composition).hasSize(1);
        assertThat(composition.get(0).cru()).isEqualTo(CognacCru.BORDERIES);
        assertThat(composition.get(0).percentage()).isNull();
    }

    @Test
    @DisplayName("extra_data 의 모르는 enum 값은 조용히 버린다 (응답이 깨지지 않는다)")
    void unknownEnumValuesAreDropped() {
        SpiritCognacDetail broken = detail(CognacGrade.XO, null,
                "{\"oakTypes\":[\"LIMOUSIN\",\"NOT_A_FOREST\"],"
                + "\"cruComposition\":[{\"cru\":\"NOT_A_CRU\",\"percentage\":10},"
                + "{\"cru\":\"BONS_BOIS\",\"percentage\":90}]}");

        var cognac = buildResponse(broken).cognacDetail();

        assertThat(cognac.oakTypes()).containsExactly(CognacOakType.LIMOUSIN);
        assertThat(cognac.cruComposition()).singleElement()
                .extracting(c -> c.cru()).isEqualTo(CognacCru.BONS_BOIS);
    }

    // ── 헬퍼 ────────────────────────────────────────────────

    private CruCompositionRequest cru(CognacCru cru, Integer percentage) {
        return new CruCompositionRequest(cru, percentage);
    }

    private CognacDetailRequest request(CognacGrade grade,
                                        List<CruCompositionRequest> composition,
                                        List<CognacOakType> oakTypes) {
        return new CognacDetailRequest(grade, null, composition, null, null,
                null, null, oakTypes, null, null);
    }

    /** CreateSpiritRequest 는 필드가 27개인 record 라 필요한 값만 스텁한다 */
    private CreateSpiritRequest createRequest(CognacDetailRequest cognac) {
        CreateSpiritRequest req = mock(CreateSpiritRequest.class);
        given(req.cognacDetail()).willReturn(cognac);
        return req;
    }

    /** 저장을 실행하고 리포지토리에 넘어간 엔티티를 돌려준다 */
    private SpiritCognacDetail saveCognac(CognacDetailRequest req) {
        Spirit spirit = cognacSpirit();
        given(cognacDetailRepo.findById(spirit.getId())).willReturn(Optional.empty());

        service.saveCategoryDetail(spirit, createRequest(req));

        ArgumentCaptor<SpiritCognacDetail> captor = ArgumentCaptor.forClass(SpiritCognacDetail.class);
        verify(cognacDetailRepo).save(captor.capture());
        return captor.getValue();
    }

    private SpiritCognacDetail detail(CognacGrade grade, CognacCru cru, String extraData) {
        return SpiritCognacDetail.builder()
                .spirit(cognacSpirit()).grade(grade).cru(cru).extraData(extraData).build();
    }

    private SpiritDetailResponse buildResponse(SpiritCognacDetail detail) {
        Spirit spirit = cognacSpirit();
        ReflectionTestUtils.setField(spirit, "cognacDetail", detail);
        return service.buildFullDetailResponse(spirit, List.of(), List.of());
    }

    private Spirit cognacSpirit() {
        Spirit spirit = Spirit.builder()
                .nameKo("헤네시 XO").nameEn("Hennessy XO")
                .category(SpiritCategory.COGNAC)
                .country("프랑스").region("꼬냑")
                .build();
        ReflectionTestUtils.setField(spirit, "id", 7L);
        return spirit;
    }
}
