package com.caskbycask.domain.bottlecollection.dto;

import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.spirit.dto.SpiritLimits;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UserBottleRequest(
    Long spiritId,
    @Size(max = 200) String spiritNameText,
    @NotNull SpiritCategory category,
    LocalDate purchaseDate,
    @Size(max = 100) String batch,

    /**
     * 병입 연도 — `YYYY` 또는 `YYYY-MM`.
     *
     * <p>이전에는 100자 자유 텍스트라 '2021년'·'모름' 같은 값이 섞일 수 있었다.
     * 운영 데이터 점검 결과 기존 값이 모두 비어 있어(18건) 형식을 고정했다.
     * 주류 상세의 증류·병입 연월과 같은 규칙이다(월은 01~12).
     */
    @Size(max = 7, message = "병입 연도는 YYYY 또는 YYYY-MM 형식입니다.")
    @Pattern(regexp = "^$|^\\d{4}(-(0[1-9]|1[0-2]))?$",
             message = "병입 연도 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM, 월은 01~12).")
    String bottlingYear,

    /**
     * 구매 가격(원).
     *
     * <p>컬럼이 {@code integer}(최대 21.4억)라 상한이 없으면 오버플로로 저장이 깨진다.
     * 10억 원은 실제 최고가 위스키·와인 낙찰가도 담는 값이다.
     */
    @Min(value = 0, message = "구매 가격은 0원 이상이어야 합니다.")
    @Max(value = 1_000_000_000L, message = "구매 가격은 10억 원 이하여야 합니다.")
    Integer price,

    @Size(max = 200) String store,

    @Min(value = SpiritLimits.VOLUME_ML_MIN, message = "용량은 1ml 이상이어야 합니다.")
    @Max(value = SpiritLimits.VOLUME_ML_MAX, message = "용량은 30000ml 이하여야 합니다.")
    Integer volumeMl,

    @NotNull BottleStatus status,
    Boolean isPublic,

    /** 컬럼은 TEXT 지만 개인 메모라 상한을 둔다 — 화면이 남은 글자수를 보여 줄 수 있어야 한다. */
    @Size(max = 1000, message = "메모는 1000자 이내여야 합니다.") String memo
) {}
