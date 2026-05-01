package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface SpiritQueryRepository {

    Page<Spirit> search(
            SpiritCategory category,
            String country,
            BigDecimal minAbv,
            BigDecimal maxAbv,
            BigDecimal minScore,
            BigDecimal maxScore,
            String keyword,
            SpiritSort sort,
            Pageable pageable
    );
}
