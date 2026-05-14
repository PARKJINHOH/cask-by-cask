package com.drinkindex.domain.winery.service;

import com.drinkindex.domain.winery.dto.CreateWineryRequest;
import com.drinkindex.domain.winery.dto.UpdateWineryRequest;
import com.drinkindex.domain.winery.dto.WineryResponse;
import com.drinkindex.domain.winery.entity.Winery;
import com.drinkindex.domain.winery.repository.WineryRepository;
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
public class WineryService {

    private final WineryRepository wineryRepository;

    @Transactional(readOnly = true)
    public Page<WineryResponse> search(String keyword, String country, Pageable pageable) {
        String keywordParam = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String countryParam = StringUtils.hasText(country) ? country.trim() : null;
        return wineryRepository.search(keywordParam, countryParam, pageable)
                .map(WineryResponse::from);
    }

    @Transactional(readOnly = true)
    public WineryResponse findById(Long id) {
        return WineryResponse.from(getWinery(id));
    }

    @Transactional
    public WineryResponse create(CreateWineryRequest request) {
        Winery winery = Winery.builder()
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .country(request.country())
                .region(request.region())
                .website(request.website())
                .foundedYear(request.foundedYear())
                .descriptionKo(request.descriptionKo())
                .descriptionEn(request.descriptionEn())
                .build();
        return WineryResponse.from(wineryRepository.save(winery));
    }

    @Transactional
    public WineryResponse update(Long id, UpdateWineryRequest request) {
        Winery winery = getWinery(id);
        winery.update(
                request.nameKo()        != null ? request.nameKo()        : winery.getNameKo(),
                request.nameEn()        != null ? request.nameEn()        : winery.getNameEn(),
                request.country()       != null ? request.country()       : winery.getCountry(),
                request.region()        != null ? request.region()        : winery.getRegion(),
                request.website()       != null ? request.website()       : winery.getWebsite(),
                request.foundedYear()   != null ? request.foundedYear()   : winery.getFoundedYear(),
                request.descriptionKo() != null ? request.descriptionKo() : winery.getDescriptionKo(),
                request.descriptionEn() != null ? request.descriptionEn() : winery.getDescriptionEn()
        );
        return WineryResponse.from(winery);
    }

    @Transactional
    public void delete(Long id) {
        wineryRepository.delete(getWinery(id));
    }

    private Winery getWinery(Long id) {
        return wineryRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.WINERY_NOT_FOUND));
    }
}
