package com.drinkindex.domain.cognacappellation.service;

import com.drinkindex.domain.cognacappellation.dto.CognacAppellationResponse;
import com.drinkindex.domain.cognacappellation.dto.CreateCognacAppellationRequest;
import com.drinkindex.domain.cognacappellation.dto.UpdateCognacAppellationRequest;
import com.drinkindex.domain.cognacappellation.entity.CognacAppellation;
import com.drinkindex.domain.cognacappellation.repository.CognacAppellationRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class CognacAppellationService {

    private final CognacAppellationRepository cognacAppellationRepository;

    @Transactional(readOnly = true)
    public Page<CognacAppellationResponse> search(String keyword, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        return cognacAppellationRepository.search(keywordParam, pageable)
                .map(CognacAppellationResponse::from);
    }

    @Transactional(readOnly = true)
    public CognacAppellationResponse findById(Long id) {
        return CognacAppellationResponse.from(getAppellation(id));
    }

    @Transactional
    public CognacAppellationResponse create(CreateCognacAppellationRequest request) {
        CognacAppellation appellation = CognacAppellation.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .descriptionKo(request.descriptionKo())
                .descriptionEn(request.descriptionEn())
                .build();
        return CognacAppellationResponse.from(cognacAppellationRepository.save(appellation));
    }

    @Transactional
    public CognacAppellationResponse update(Long id, UpdateCognacAppellationRequest request) {
        CognacAppellation appellation = getAppellation(id);
        appellation.update(
                request.nameKo()        != null ? request.nameKo()        : appellation.getNameKo(),
                request.nameEn()        != null ? request.nameEn()        : appellation.getNameEn(),
                request.descriptionKo() != null ? request.descriptionKo() : appellation.getDescriptionKo(),
                request.descriptionEn() != null ? request.descriptionEn() : appellation.getDescriptionEn()
        );
        return CognacAppellationResponse.from(appellation);
    }

    @Transactional
    public void delete(Long id) {
        cognacAppellationRepository.delete(getAppellation(id));
    }

    private CognacAppellation getAppellation(Long id) {
        return cognacAppellationRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.COGNAC_APPELLATION_NOT_FOUND));
    }
}
