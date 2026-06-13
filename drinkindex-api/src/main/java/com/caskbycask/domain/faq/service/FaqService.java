package com.caskbycask.domain.faq.service;

import com.caskbycask.domain.faq.dto.*;
import com.caskbycask.domain.faq.entity.Faq;
import com.caskbycask.domain.faq.entity.enums.FaqCategory;
import com.caskbycask.domain.faq.entity.enums.FaqLanguage;
import com.caskbycask.domain.faq.repository.FaqRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
        // 신규 FAQ는 같은 언어·카테고리 목록의 맨 위로 배치 (sortOrder가 작을수록 위).
        List<Faq> sameGroup = faqRepository
                .findByLanguageAndCategoryOrderBySortOrderAsc(request.getLanguage(), request.getCategory());
        int topOrder = sameGroup.isEmpty() ? 0 : sameGroup.get(0).getSortOrder() - 1;

        Faq faq = Faq.builder()
                .language(request.getLanguage())
                .category(request.getCategory())
                .question(request.getQuestion())
                .answer(request.getAnswer())
                .sortOrder(topOrder)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        return new AdminFaqDetailResponse(faqRepository.save(faq));
    }

    @Transactional
    public AdminFaqDetailResponse updateFaq(Long id, UpdateFaqRequest request) {
        Faq faq = findById(id);
        faq.update(request.getCategory(), request.getQuestion(), request.getAnswer(),
                request.getIsActive());
        return new AdminFaqDetailResponse(faq);
    }

    @Transactional
    public void updateSortOrder(Long id, Integer sortOrder) {
        findById(id).setSortOrder(sortOrder);
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
