package com.drinkindex.domain.faq.service;

import com.drinkindex.domain.faq.dto.*;
import com.drinkindex.domain.faq.entity.Faq;
import com.drinkindex.domain.faq.entity.enums.FaqCategory;
import com.drinkindex.domain.faq.entity.enums.FaqLanguage;
import com.drinkindex.domain.faq.repository.FaqRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FaqService {

    private final FaqRepository faqRepository;

    // ── 공개 API ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FaqGroupResponse> getPublicFaqs(String lang) {
        FaqLanguage language = "en".equalsIgnoreCase(lang) ? FaqLanguage.EN : FaqLanguage.KO;
        List<Faq> faqs = faqRepository
                .findByLanguageAndIsActiveTrueOrderByCategoryAscSortOrderAsc(language);

        Map<FaqCategory, List<FaqItemResponse>> grouped = faqs.stream()
                .collect(Collectors.groupingBy(
                        Faq::getCategory,
                        Collectors.mapping(FaqItemResponse::new, Collectors.toList())
                ));

        return Arrays.stream(FaqCategory.values())
                .filter(grouped::containsKey)
                .map(cat -> new FaqGroupResponse(cat, lang, grouped.get(cat)))
                .toList();
    }

    // ── 관리자 API ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdminFaqListResponse> getAdminFaqs(FaqLanguage language) {
        List<Faq> faqs = language != null
                ? faqRepository.findByLanguageOrderByCategoryAscSortOrderAsc(language)
                : faqRepository.findAllByOrderByLanguageAscCategoryAscSortOrderAsc();
        return faqs.stream().map(AdminFaqListResponse::new).toList();
    }

    @Transactional(readOnly = true)
    public AdminFaqDetailResponse getAdminFaqDetail(Long id) {
        return new AdminFaqDetailResponse(findById(id));
    }

    @Transactional
    public AdminFaqDetailResponse createFaq(CreateFaqRequest request) {
        Faq faq = Faq.builder()
                .language(request.getLanguage())
                .category(request.getCategory())
                .question(request.getQuestion())
                .answer(request.getAnswer())
                .sortOrder(request.getSortOrder())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        return new AdminFaqDetailResponse(faqRepository.save(faq));
    }

    @Transactional
    public AdminFaqDetailResponse updateFaq(Long id, UpdateFaqRequest request) {
        Faq faq = findById(id);
        faq.update(request.getCategory(), request.getQuestion(), request.getAnswer(),
                request.getSortOrder(), request.getIsActive());
        return new AdminFaqDetailResponse(faq);
    }

    @Transactional
    public void deleteFaq(Long id) {
        Faq faq = findById(id);
        faqRepository.delete(faq);
    }

    @Transactional
    public void updateActive(Long id, Boolean isActive) {
        findById(id).setActive(isActive);
    }

    // ── 내부 ──────────────────────────────────────────────────

    private Faq findById(Long id) {
        return faqRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
    }
}
