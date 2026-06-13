package com.caskbycask.domain.faq.repository;

import com.caskbycask.domain.faq.entity.Faq;
import com.caskbycask.domain.faq.entity.enums.FaqCategory;
import com.caskbycask.domain.faq.entity.enums.FaqLanguage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqRepository extends JpaRepository<Faq, Long> {

    List<Faq> findByLanguageAndIsActiveTrueOrderByCategoryAscSortOrderAsc(FaqLanguage language);

    List<Faq> findByLanguageOrderByCategoryAscSortOrderAsc(FaqLanguage language);

    List<Faq> findAllByOrderByLanguageAscCategoryAscSortOrderAsc();

    List<Faq> findByLanguageAndCategoryOrderBySortOrderAsc(FaqLanguage language, FaqCategory category);
}
