package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.CognacCru;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.CognacOakType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CognacDetailRequest(

        @Schema(description = "꼬냑 등급 (VS, NAPOLEON, VSOP, XO, XXO, EXTRA, HORS_DAGE)")
        CognacGrade grade,

        @Schema(description = "대표 크뤼. cruComposition 을 보내면 비율이 가장 높은 크뤼로 서버가 덮어쓴다.")
        CognacCru cru,

        @Schema(description = "크뤼 구성 (비율 합계 100% 이하). 1개면 싱글 크뤼, 2개 이상이면 멀티 크뤼 블렌드")
        @Valid
        List<CruCompositionRequest> cruComposition,

        @Schema(description = "Fine Champagne 여부 (Grande + Petite Champagne 블렌드, Grande 50%+)")
        Boolean isFineChampagne,

        @Schema(description = "블렌드 추가 설명")
        @Size(max = 300, message = "블렌드 설명은 300자 이하여야 합니다.")
        String blendDetail,

        @Schema(description = "빈티지 연도 (빈티지 꼬냑)")
        @Min(value = 1800, message = "빈티지 연도는 1800년 이후여야 합니다.")
        Integer vintageYear,

        @Schema(description = "선언 숙성 연수 (년)")
        @Min(value = 0, message = "숙성 연수는 0 이상이어야 합니다.")
        Integer ageYears,

        @Schema(description = "오크(우드) 종류 — 프렌치 오크 숲. 리무쟁·트롱세 병용처럼 복수 선택 가능")
        List<CognacOakType> oakTypes,

        @Schema(description = "캐스크 피니시 / 추가 숙성 (자유 입력)")
        @Size(max = 200, message = "캐스크 피니시는 200자 이하여야 합니다.")
        String caskFinish,

        @Schema(description = "기타 정보 (출시·숙성 관련 참고 설명)")
        @Size(max = 500, message = "기타 정보는 500자 이하여야 합니다.")
        String notes

) {}
