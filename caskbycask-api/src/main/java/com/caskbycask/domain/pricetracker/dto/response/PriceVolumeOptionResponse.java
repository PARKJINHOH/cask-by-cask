package com.caskbycask.domain.pricetracker.dto.response;

/** 가격 차트에서 선택할 병 용량과 승인 데이터 건수. volumeMl=null은 기존 용량 미확인 데이터다. */
public record PriceVolumeOptionResponse(
        Integer volumeMl,
        long count
) {}
