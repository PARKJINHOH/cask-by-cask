package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SpiritSearchService {
    Page<Long> searchSpiritIds(SpiritSearchCondition condition, Pageable pageable);
}
