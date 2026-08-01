package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 기존 생산자/주류의 자유 입력 국가·지역 텍스트를 현재 산지 코드로 연결한다.
 *
 * <p>정규 산지의 단일 소스는 여전히 {@link WineRegion} 이다. 이 클래스의 별칭은 과거 시드에
 * 실제 저장된 표현을 기존 코드에 연결하는 호환 계층일 뿐 새 산지를 정의하지 않는다.
 * 복수 산지({@code /})나 단일 코드로 확정할 수 없는 값은 추측하지 않고 미매핑으로 남긴다.
 */
@Component
public class LegacyWineRegionResolver {

    private static final Map<String, Set<String>> COUNTRY_CODES = Map.ofEntries(
            country("프랑스", "FR"), country("이탈리아", "IT"), country("스페인", "ES"),
            country("포르투갈", "PT"), country("독일", "DE"), country("오스트리아", "AT"),
            country("헝가리", "HU"), country("그리스", "GR"), country("조지아", "GE"),
            country("레바논", "LB"), country("중국", "CN"), country("미국", "US"),
            country("칠레", "CL"), country("아르헨티나", "AR"), country("우루과이", "UY"),
            country("호주", "AU"), country("뉴질랜드", "NZ"),
            country("남아프리카공화국", "ZA"), country("남아공", "ZA"),
            country("일본", "JP"), country("인도", "IN"), country("캐나다", "CA"),
            country("스코틀랜드", "GB-SCT"), country("잉글랜드", "GB-ENG"),
            country("웨일스", "GB-WLS"), country("북아일랜드", "GB-NIR"),
            country("아일랜드", "IE"), country("대만", "TW"), country("대한민국", "KR"),
            country("스웨덴", "SE"), country("네덜란드", "NL"), country("덴마크", "DK"),
            country("핀란드", "FI"), country("이스라엘", "IL"),
            // 영국으로 저장된 데이터는 지역명으로 구성국을 확정할 수 있을 때만 연결한다.
            Map.entry(normalize("영국"), Set.of("GB-ENG", "GB-WLS", "GB-NIR", "GB-SCT")),
            Map.entry(normalize("United Kingdom"), Set.of("GB-ENG", "GB-WLS", "GB-NIR", "GB-SCT")),
            Map.entry(normalize("Scotland"), Set.of("GB-SCT")),
            Map.entry(normalize("England"), Set.of("GB-ENG")),
            Map.entry(normalize("Wales"), Set.of("GB-WLS")),
            Map.entry(normalize("Northern Ireland"), Set.of("GB-NIR")),
            Map.entry(normalize("Ireland"), Set.of("IE")),
            Map.entry(normalize("South Africa"), Set.of("ZA"))
    );

    /** 시드에 존재하지만 카탈로그 표기만으로는 해석할 수 없는 검증된 호환 별칭. */
    private static final Map<LegacyKey, WineRegion> ALIASES = Map.ofEntries(
            alias(SpiritCategory.WHISKY, "남아프리카공화국", "웰링턴", WineRegion.ZA_CAPE_WINELANDS),
            alias(SpiritCategory.WHISKY, "네덜란드", "바를러나사우", WineRegion.NL_NOORD_BRABANT),
            alias(SpiritCategory.WHISKY, "스코틀랜드", "Island", WineRegion.GB_SCT_ISLANDS),
            alias(SpiritCategory.WHISKY, "스코틀랜드", "Isle of Arran", WineRegion.GB_SCT_ISLANDS),
            alias(SpiritCategory.WHISKY, "스코틀랜드", "Isle of Jura", WineRegion.GB_SCT_ISLANDS),
            alias(SpiritCategory.WHISKY, "스코틀랜드", "Isle of Mull", WineRegion.GB_SCT_ISLANDS),
            alias(SpiritCategory.WHISKY, "스코틀랜드", "Isle of Raasay", WineRegion.GB_SCT_ISLANDS),
            alias(SpiritCategory.WHISKY, "스코틀랜드", "Isle of Skye", WineRegion.GB_SCT_ISLANDS),
            alias(SpiritCategory.WHISKY, "스코틀랜드", "Orkney", WineRegion.GB_SCT_ISLANDS),
            alias(SpiritCategory.WHISKY, "아일랜드", "북아일랜드 (앤트림)", WineRegion.GB_NIR_ANTRIM),
            alias(SpiritCategory.WHISKY, "웨일스", "브레컨 비콘스", WineRegion.GB_WLS_POWYS),
            alias(SpiritCategory.WHISKY, "인도", "벵갈루루", WineRegion.IN_KARNATAKA),
            alias(SpiritCategory.WHISKY, "핀란드", "이소키로", WineRegion.FI_OSTROBOTHNIA),
            alias(SpiritCategory.WHISKY, "호주", "멜버른", WineRegion.AU_VICTORIA),
            alias(SpiritCategory.WHISKY, "호주", "서오스트레일리아 (앨버니)", WineRegion.AU_WESTERN_AUSTRALIA),

            alias(SpiritCategory.WINE, "그리스", "나우사", WineRegion.GR_MACEDONIA),
            alias(SpiritCategory.WINE, "그리스", "산토리니", WineRegion.GR_AEGEAN),
            alias(SpiritCategory.WINE, "그리스", "아민데오", WineRegion.GR_MACEDONIA),
            alias(SpiritCategory.WINE, "남아공", "스와틀란트", WineRegion.ZA_WEST_COAST),
            alias(SpiritCategory.WINE, "남아공", "헤멜엔아르더", WineRegion.ZA_OVERBERG),
            alias(SpiritCategory.WINE, "남아프리카공화국", "콘스탄시아", WineRegion.ZA_CAPE_TOWN),
            alias(SpiritCategory.WINE, "남아프리카공화국", "프란스후크", WineRegion.ZA_CAPE_WINELANDS_FRANSCHHOEK),
            alias(SpiritCategory.WINE, "뉴질랜드", "마틴버러", WineRegion.NZ_WAIRARAPA),
            alias(SpiritCategory.WINE, "뉴질랜드", "혹스베이", WineRegion.NZ_HAWKES_BAY),
            alias(SpiritCategory.WINE, "독일", "나에", WineRegion.DE_NAHE),
            alias(SpiritCategory.WINE, "미국", "캘리포니아 (파소 로블레스)", WineRegion.US_CALIFORNIA_PASO_ROBLES),
            alias(SpiritCategory.WINE, "스페인", "산루카르 (만사니야)", WineRegion.ES_ANDALUCIA_JEREZ),
            alias(SpiritCategory.WINE, "스페인", "엘 푸에르토 데 산타 마리아", WineRegion.ES_ANDALUCIA_JEREZ),
            alias(SpiritCategory.WINE, "이탈리아", "알토 아디제", WineRegion.IT_TRENTINO_ALTO_ADIGE),
            alias(SpiritCategory.WINE, "칠레", "마이포 밸리", WineRegion.CL_CENTRAL_VALLEY_MAIPO),
            alias(SpiritCategory.WINE, "프랑스", "샴페인", WineRegion.FR_CHAMPAGNE),
            alias(SpiritCategory.WINE, "호주", "캔버라", WineRegion.AU_NEW_SOUTH_WALES_CANBERRA_DISTRICT)
    );

    public Optional<WineRegion> resolve(SpiritCategory category, String country, String legacyRegion) {
        if (category == null || isBlank(country) || isBlank(legacyRegion) || legacyRegion.contains("/")) {
            return Optional.empty();
        }

        WineRegion alias = ALIASES.get(new LegacyKey(category, normalize(country), normalize(legacyRegion)));
        if (alias != null) {
            return Optional.of(alias);
        }

        Set<String> countryCodes = COUNTRY_CODES.getOrDefault(normalize(country), Set.of());
        if (countryCodes.isEmpty()) {
            return Optional.empty();
        }

        String value = legacyRegion.trim();
        int open = value.indexOf('(');
        int close = value.lastIndexOf(')');
        if (open >= 0 && close > open) {
            String inner = value.substring(open + 1, close).trim();
            Optional<WineRegion> innerMatch = uniqueMatch(category, countryCodes, inner);
            if (innerMatch.isPresent()) {
                return innerMatch;
            }
            value = value.substring(0, open).trim();
        }

        return uniqueMatch(category, countryCodes, value);
    }

    private Optional<WineRegion> uniqueMatch(
            SpiritCategory category, Set<String> countryCodes, String value) {
        String normalized = normalize(value);
        Set<WineRegion> matches = new LinkedHashSet<>();
        Arrays.stream(WineRegion.values())
                .filter(region -> region.supports(category))
                .filter(region -> countryCodes.contains(region.getCountryCode()))
                .filter(region -> normalize(region.getNameKo()).equals(normalized)
                        || normalize(region.getNameEn()).equals(normalized))
                .forEach(matches::add);
        return matches.size() == 1 ? Optional.of(matches.iterator().next()) : Optional.empty();
    }

    private static Map.Entry<String, Set<String>> country(String name, String code) {
        return Map.entry(normalize(name), Set.of(code));
    }

    private static Map.Entry<LegacyKey, WineRegion> alias(
            SpiritCategory category, String country, String region, WineRegion target) {
        return Map.entry(new LegacyKey(category, normalize(country), normalize(region)), target);
    }

    private static String normalize(String value) {
        String decomposed = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKD);
        return decomposed
                .replaceAll("\\p{M}+", "")
                .replaceAll("[\\s\\-_'’·.]+", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record LegacyKey(SpiritCategory category, String country, String region) {}
}
