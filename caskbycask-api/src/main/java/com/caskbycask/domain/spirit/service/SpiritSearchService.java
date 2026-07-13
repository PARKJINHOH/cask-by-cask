package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface SpiritSearchService {
    Page<Long> searchSpiritIds(SpiritSearchCondition condition, Pageable pageable);
    List<SpiritAutocompleteResponse> autocompleteSpirits(String keyword);
    List<SpiritAutocompleteResponse> autocompleteSpirits(String keyword, boolean includeVariants);
}
