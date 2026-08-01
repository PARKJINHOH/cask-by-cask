package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.WineRegionCountryResponse;
import com.caskbycask.domain.spirit.dto.WineRegionResponse;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 산지 카탈로그 조회 · 검증.
 *
 * <p>카탈로그는 {@link WineRegion} enum 이 소유하는 불변 데이터이므로
 * 응답 트리를 클래스 로딩 시점에 1회 조립해 재사용한다(요청마다 재계산하지 않는다).
 * 카테고리별 트리도 미리 만들어 둔다 — 카테고리 수가 적고 불변이기 때문이다.
 */
@Service
public class WineRegionService {

    /** 카테고리 → (국가 → L1(+L2 children)) 트리. enum 이 불변이므로 정적 1회 계산으로 충분하다. */
    private static final Map<SpiritCategory, List<WineRegionCountryResponse>> CATALOG_BY_CATEGORY;
    /** 카테고리 무지정(전체) 트리 */
    private static final List<WineRegionCountryResponse> CATALOG_ALL = buildCatalog(null);

    static {
        Map<SpiritCategory, List<WineRegionCountryResponse>> byCategory =
                new EnumMap<>(SpiritCategory.class);
        for (SpiritCategory category : SpiritCategory.values()) {
            byCategory.put(category, buildCatalog(category));
        }
        CATALOG_BY_CATEGORY = Collections.unmodifiableMap(byCategory);
    }

    private static List<WineRegionCountryResponse> buildCatalog(SpiritCategory category) {
        return WineRegion.countryCodes(category).stream()
                .map(countryCode -> new WineRegionCountryResponse(
                        countryCode,
                        WineRegion.topLevelsOf(countryCode, category).stream()
                                .map(WineRegionResponse::tree)
                                .toList()))
                .toList();
    }

    /**
     * 산지 카탈로그 (국가 → L1 → L2).
     *
     * @param category null 이면 전체. 카테고리를 주면 그 카테고리에서 쓰는 산지만 반환한다
     *                 (버번 등록 화면에 와인 산지가 나오지 않게 하기 위함).
     */
    public List<WineRegionCountryResponse> getCatalog(SpiritCategory category) {
        return category == null ? CATALOG_ALL : CATALOG_BY_CATEGORY.get(category);
    }

    /**
     * 산지 코드를 {@link WineRegion} 으로 해석한다.
     *
     * @param code null·공백이면 null 반환 (산지 미지정 허용)
     * @throws CustomException 카탈로그에 없는 코드인 경우 {@link ErrorCode#INVALID_INPUT}
     */
    public WineRegion resolve(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return WineRegion.fromCode(code)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
    }

    /** 산지 코드가 실제 주류 카테고리에서도 사용 가능한지 함께 검증한다. */
    public WineRegion resolve(String code, SpiritCategory category) {
        WineRegion region = resolve(code);
        if (region != null && !region.supports(category)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return region;
    }
}
