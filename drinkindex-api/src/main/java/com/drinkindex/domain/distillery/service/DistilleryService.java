package com.drinkindex.domain.distillery.service;

import com.drinkindex.domain.distillery.dto.CreateDistilleryRequest;
import com.drinkindex.domain.distillery.dto.DistilleryResponse;
import com.drinkindex.domain.distillery.dto.UpdateDistilleryRequest;
import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.distillery.repository.DistilleryRepository;
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
public class DistilleryService {

    private final DistilleryRepository distilleryRepository;

    @Transactional(readOnly = true)
    public Page<DistilleryResponse> search(String keyword, String country, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String countryParam = StringUtils.hasText(country) ? country.trim() : null;
        return distilleryRepository.search(keywordParam, countryParam, pageable)
                .map(DistilleryResponse::from);
    }

    @Transactional(readOnly = true)
    public DistilleryResponse findById(Long id) {
        return DistilleryResponse.from(getDistillery(id));
    }

    @Transactional
    public DistilleryResponse create(CreateDistilleryRequest request) {
        Distillery distillery = Distillery.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .country(request.country())
                .region(request.region())
                .website(request.website())
                .foundedYear(request.foundedYear())
                .descriptionKo(request.descriptionKo())
                .descriptionEn(request.descriptionEn())
                .build();
        return DistilleryResponse.from(distilleryRepository.save(distillery));
    }

    @Transactional
    public DistilleryResponse update(Long id, UpdateDistilleryRequest request) {
        Distillery distillery = getDistillery(id);

        // null 필드는 기존 값 유지 (PATCH 동작)
        distillery.update(
                request.nameKo()        != null ? request.nameKo()        : distillery.getNameKo(),
                request.nameEn()        != null ? request.nameEn()        : distillery.getNameEn(),
                request.country()       != null ? request.country()       : distillery.getCountry(),
                request.region()        != null ? request.region()        : distillery.getRegion(),
                request.website()       != null ? request.website()       : distillery.getWebsite(),
                request.foundedYear()   != null ? request.foundedYear()   : distillery.getFoundedYear(),
                request.descriptionKo() != null ? request.descriptionKo() : distillery.getDescriptionKo(),
                request.descriptionEn() != null ? request.descriptionEn() : distillery.getDescriptionEn()
        );
        return DistilleryResponse.from(distillery);
    }

    @Transactional
    public void delete(Long id) {
        Distillery distillery = getDistillery(id);
        distilleryRepository.delete(distillery);
    }

    private Distillery getDistillery(Long id) {
        return distilleryRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
    }
}
