package com.drinkindex.domain.cognachouse.service;

import com.drinkindex.domain.cognachouse.dto.CognacHouseResponse;
import com.drinkindex.domain.cognachouse.dto.CreateCognacHouseRequest;
import com.drinkindex.domain.cognachouse.dto.UpdateCognacHouseRequest;
import com.drinkindex.domain.cognachouse.entity.CognacHouse;
import com.drinkindex.domain.cognachouse.repository.CognacHouseRepository;
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
public class CognacHouseService {

    private final CognacHouseRepository cognacHouseRepository;

    @Transactional(readOnly = true)
    public Page<CognacHouseResponse> search(
            String keyword, String nameKo, String nameEn, String country, Integer foundedYear, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String nameKoParam = StringUtils.hasText(nameKo) ? nameKo.trim() : null;
        String nameEnParam = StringUtils.hasText(nameEn) ? nameEn.trim() : null;
        String countryParam = StringUtils.hasText(country) ? country.trim() : null;
        return cognacHouseRepository.search(keywordParam, nameKoParam, nameEnParam, countryParam, foundedYear, pageable)
                .map(CognacHouseResponse::from);
    }

    @Transactional(readOnly = true)
    public CognacHouseResponse findById(Long id) {
        return CognacHouseResponse.from(getCognacHouse(id));
    }

    @Transactional
    public CognacHouseResponse create(CreateCognacHouseRequest request) {
        CognacHouse cognacHouse = CognacHouse.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .country(request.country())
                .region(request.region())
                .website(request.website())
                .foundedYear(request.foundedYear())
                .descriptionKo(request.descriptionKo())
                .descriptionEn(request.descriptionEn())
                .build();
        return CognacHouseResponse.from(cognacHouseRepository.save(cognacHouse));
    }

    @Transactional
    public CognacHouseResponse update(Long id, UpdateCognacHouseRequest request) {
        CognacHouse cognacHouse = getCognacHouse(id);
        cognacHouse.update(
                request.nameKo()        != null ? request.nameKo()        : cognacHouse.getNameKo(),
                request.nameEn()        != null ? request.nameEn()        : cognacHouse.getNameEn(),
                request.country()       != null ? request.country()       : cognacHouse.getCountry(),
                request.region()        != null ? request.region()        : cognacHouse.getRegion(),
                request.website()       != null ? request.website()       : cognacHouse.getWebsite(),
                request.foundedYear()   != null ? request.foundedYear()   : cognacHouse.getFoundedYear(),
                request.descriptionKo() != null ? request.descriptionKo() : cognacHouse.getDescriptionKo(),
                request.descriptionEn() != null ? request.descriptionEn() : cognacHouse.getDescriptionEn()
        );
        return CognacHouseResponse.from(cognacHouse);
    }

    @Transactional
    public void delete(Long id) {
        cognacHouseRepository.delete(getCognacHouse(id));
    }

    private CognacHouse getCognacHouse(Long id) {
        return cognacHouseRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.COGNAC_HOUSE_NOT_FOUND));
    }
}
