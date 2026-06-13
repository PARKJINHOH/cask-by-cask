package com.caskbycask.domain.producer.dto;

import com.caskbycask.domain.producer.entity.ProducerType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProducerRequest(
        @Schema(description = "생산자 종류 (null이면 DISTILLERY)")
        ProducerType type,

        @Schema(description = "한글 증류소명")
        @NotBlank(message = "한국어 증류소명을 입력해주세요.")
        @Size(max = 200, message = "증류소명은 200자 이하로 입력해주세요.")
        String nameKo,

        @Schema(description = "영문 증류소명")
        @NotBlank(message = "영문 증류소명을 입력해주세요.")
        @Size(max = 200, message = "증류소명은 200자 이하로 입력해주세요.")
        String nameEn,

        @Schema(description = "소재 국가")
        @NotBlank(message = "국가를 입력해주세요.")
        @Size(max = 100, message = "국가명은 100자 이하로 입력해주세요.")
        String country,

        @Schema(description = "소재 지역 (선택)")
        @Size(max = 100, message = "지역명은 100자 이하로 입력해주세요.")
        String region,

        @Schema(description = "공식 웹사이트 URL (선택)")
        @Size(max = 500, message = "웹사이트 URL은 500자 이하로 입력해주세요.")
        String website,

        @Schema(description = "설립연도 (선택)")
        Integer foundedYear,

        @Schema(description = "한글 소개 (선택)")
        String descriptionKo,

        @Schema(description = "영문 소개 (선택)")
        String descriptionEn,

        @Schema(description = "검색 별칭 (선택) — 한글 음차 변형 등, 공백/콤마 구분")
        @Size(max = 300, message = "검색 별칭은 300자 이하로 입력해주세요.")
        String searchKeywords
) {}
