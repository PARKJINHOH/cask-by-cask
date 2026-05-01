package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.dto.SpiritListResponse;
import com.drinkindex.domain.spirit.dto.SpiritSearchCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SpiritQueryRepository {

    Page<SpiritListResponse> search(SpiritSearchCondition condition, Pageable pageable);
}
