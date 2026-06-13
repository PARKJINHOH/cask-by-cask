package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.dto.SpiritListResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SpiritQueryRepository {

    Page<SpiritListResponse> search(SpiritSearchCondition condition, Pageable pageable);
}
