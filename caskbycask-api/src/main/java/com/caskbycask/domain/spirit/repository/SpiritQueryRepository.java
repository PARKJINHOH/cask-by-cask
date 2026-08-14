package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.dto.SpiritListResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SpiritQueryRepository {

    Page<SpiritListResponse> search(SpiritSearchCondition condition, Pageable pageable);

    Page<SpiritListResponse> searchForAdmin(SpiritSearchCondition condition, Pageable pageable);

    /** 검색 조건에 걸린 마스터 주류 수(목록에 실리는 카드 수와 같다). */
    long countMasters(SpiritSearchCondition condition);

    /**
     * 같은 검색 조건에 걸린 마스터 주류들이 거느린 에디션(하위 병입) 수.
     *
     * 목록은 마스터만 싣지만 '총 몇 개'를 말할 때는 에디션도 등록된 제품이라 함께 센다.
     * 에디션 자체의 속성(도수 등)이 아니라 **부모가 조건에 맞는지**로 센다 —
     * 목록에 보이는 카드들이 실제로 몇 개의 제품을 대표하는지가 이 숫자의 뜻이다.
     */
    long countEditions(SpiritSearchCondition condition);

    java.util.List<SpiritListResponse> findListByIds(java.util.List<Long> ids, boolean includeStyle);
}
