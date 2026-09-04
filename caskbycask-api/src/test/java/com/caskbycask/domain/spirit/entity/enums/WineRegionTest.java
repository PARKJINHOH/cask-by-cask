package com.caskbycask.domain.spirit.entity.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 산지 카탈로그 무결성 (와인 + 위스키).
 *
 * <p>산지를 추가·수정할 때 계층·이름·코드 규칙이 깨지지 않도록 고정한다.
 * 프론트엔드 기하 파일이 이 코드 목록을 키로 사용하므로 코드 규칙 위반은 지도 렌더 실패로 이어진다.
 */
class WineRegionTest {

    /**
     * 대상 국가 — 와인은 국내 유통(wine21 등)에서 다루는 대중적 생산국,
     * 위스키는 스카치·아이리시·재팬·대만·인디언·캐나디안·아메리칸 및 신흥국,
     * 꼬냑은 프랑스 꼬냑 지방(법정 6개 크뤼)이다.
     * 시드 데이터(V4 증류소 / V5 와이너리 / V6 꼬냑)에 등장하는 국가를 기준으로 삼는다.
     * 확장 시 이 목록도 함께 갱신한다.
     */
    private static final Set<String> WINE_COUNTRIES = Set.of(
            "FR", "IT", "ES", "US", "CL", "AU",
            "PT", "DE", "AT", "HU", "NZ", "AR", "ZA",
            // KR — 국내 와이너리(그랑꼬또·여포와인농장 등)가 시드에 있고, V108 에서
            // KR_* 시도 17개가 WINE 을 지원하도록 넓혔다.
            "CN", "GR", "GE", "LB", "UY", "JP", "IN", "CA", "GB-ENG", "KR");

    private static final Set<String> WHISKY_COUNTRIES = Set.of(
            "GB-SCT", "GB-ENG", "GB-WLS", "GB-NIR", "IE", "JP", "TW", "KR", "IN", "CA",
            "US", "AU", "ZA", "DE", "FR", "SE", "NL", "DK", "FI", "IL");

    private static final Set<String> COGNAC_COUNTRIES = Set.of("FR");

    private static final Set<String> SUPPORTED_COUNTRIES =
            Stream.of(WINE_COUNTRIES, WHISKY_COUNTRIES, COGNAC_COUNTRIES)
                    .flatMap(Set::stream)
                    .collect(java.util.stream.Collectors.toUnmodifiableSet());

    @Test
    @DisplayName("코드는 region_code 컬럼 길이(40) 안에 들어간다")
    void codeFitsColumnLength() {
        assertThat(WineRegion.values())
                .allSatisfy(region -> assertThat(region.getCode().length())
                        .as("code=%s", region.getCode())
                        .isLessThanOrEqualTo(WineRegion.MAX_CODE_LENGTH));
    }

    @Test
    @DisplayName("코드는 대문자·숫자·언더스코어만 사용한다")
    void codeUsesSafeCharacters() {
        assertThat(WineRegion.values())
                .allSatisfy(region -> assertThat(region.getCode()).matches("[A-Z0-9_]+"));
    }

    @Test
    @DisplayName("모든 산지는 지원 국가에 속하고 코드는 국가 코드로 시작한다")
    void belongsToSupportedCountry() {
        assertThat(WineRegion.values()).allSatisfy(region -> {
            assertThat(region.getCountryCode())
                    .as("code=%s", region.getCode())
                    .isIn(SUPPORTED_COUNTRIES);
            // 스코틀랜드처럼 ISO 3166-2 코드(GB-SCT)를 쓰는 경우 하이픈을 언더스코어로 바꿔 비교한다
            assertThat(region.getCode())
                    .as("코드 접두사와 countryCode 가 일치해야 한다: %s", region.getCode())
                    .startsWith(region.getCountryCode().replace('-', '_') + "_");
        });
        assertThat(WineRegion.countryCodes()).containsExactlyInAnyOrderElementsOf(SUPPORTED_COUNTRIES);
    }

    @Test
    @DisplayName("모든 산지는 최소 한 개 카테고리를 갖고, 카테고리별 국가 목록이 분리된다")
    void categoriesAreDeclared() {
        assertThat(WineRegion.values()).allSatisfy(region ->
                assertThat(region.getCategories())
                        .as("카테고리 미지정: %s", region.getCode())
                        .isNotEmpty());

        assertThat(WineRegion.countryCodes(SpiritCategory.WINE))
                .containsExactlyInAnyOrderElementsOf(WINE_COUNTRIES);
        assertThat(WineRegion.countryCodes(SpiritCategory.WHISKY))
                .containsExactlyInAnyOrderElementsOf(WHISKY_COUNTRIES);
        assertThat(WineRegion.countryCodes(SpiritCategory.COGNAC))
                .containsExactlyInAnyOrderElementsOf(COGNAC_COUNTRIES);
    }

    @Test
    @DisplayName("꼬냑 산지는 법정 6개 크뤼를 L2 로 갖는다")
    void cognacCrusExist() {
        assertThat(WineRegion.FR_COGNAC.supports(SpiritCategory.COGNAC)).isTrue();
        assertThat(WineRegion.FR_COGNAC.children()).extracting(WineRegion::getCode)
                .containsExactlyInAnyOrder(
                        "FR_COGNAC_GRANDE_CHAMPAGNE", "FR_COGNAC_PETITE_CHAMPAGNE",
                        "FR_COGNAC_BORDERIES", "FR_COGNAC_FINS_BOIS",
                        "FR_COGNAC_BONS_BOIS", "FR_COGNAC_BOIS_ORDINAIRES");
        // 꼬냑 산지는 와인 목록에 섞이지 않아야 한다
        assertThat(WineRegion.topLevelsOf("FR", SpiritCategory.WINE))
                .doesNotContain(WineRegion.FR_COGNAC);
    }

    @Test
    @DisplayName("카테고리 필터는 다른 카테고리 산지를 노출하지 않는다")
    void categoryFilterExcludesOthers() {
        // 미국은 와인(캘리포니아)과 위스키(켄터키)가 겹치는 대표 사례다
        assertThat(WineRegion.topLevelsOf("US", SpiritCategory.WINE))
                .contains(WineRegion.US_CALIFORNIA)
                .doesNotContain(WineRegion.US_KENTUCKY);
        assertThat(WineRegion.topLevelsOf("US", SpiritCategory.WHISKY))
                .contains(WineRegion.US_KENTUCKY)
                .doesNotContain(WineRegion.US_CALIFORNIA);

        // 태즈메이니아는 두 카테고리 모두에 나온다
        assertThat(WineRegion.AU_TASMANIA.supports(SpiritCategory.WINE)).isTrue();
        assertThat(WineRegion.AU_TASMANIA.supports(SpiritCategory.WHISKY)).isTrue();
    }

    @Test
    @DisplayName("스카치 위스키 규정의 법정 지리적 표시 5개가 모두 있다")
    void scotchLegalIndicationsExist() {
        assertThat(WineRegion.topLevelsOf("GB-SCT", SpiritCategory.WHISKY))
                .contains(
                        WineRegion.GB_SCT_HIGHLAND, WineRegion.GB_SCT_LOWLAND,
                        WineRegion.GB_SCT_SPEYSIDE, WineRegion.GB_SCT_ISLAY,
                        WineRegion.GB_SCT_CAMPBELTOWN);
    }

    @Test
    @DisplayName("계층은 2단이다 — L1 은 부모가 없고 L2 의 부모는 항상 L1")
    void hierarchyIsTwoLevels() {
        for (WineRegion region : WineRegion.values()) {
            if (region.isTopLevel()) {
                assertThat(region.parent()).as("L1 은 부모가 없다: %s", region).isNull();
                assertThat(region.topLevel()).isSameAs(region);
            } else {
                WineRegion parent = region.parent();
                assertThat(parent).as("L2 의 부모가 존재해야 한다: %s", region).isNotNull();
                assertThat(parent.isTopLevel()).as("L2 의 부모는 L1 이어야 한다: %s", region).isTrue();
                assertThat(region.topLevel()).isSameAs(parent);
                assertThat(region.children()).as("L2 는 자식을 갖지 않는다: %s", region).isEmpty();
            }
        }
    }

    @Test
    @DisplayName("L2 코드는 부모 L1 코드를 접두사로 갖는다")
    void childCodeIsPrefixedByParent() {
        assertThat(WineRegion.values())
                .filteredOn(region -> !region.isTopLevel())
                .allSatisfy(region -> assertThat(region.getCode())
                        .as("L2 코드는 부모 코드로 시작해야 한다: %s", region.getCode())
                        .startsWith(region.parent().getCode() + "_"));
    }

    @Test
    @DisplayName("children() 과 parent() 는 서로 일관된다")
    void childrenAndParentAreConsistent() {
        for (WineRegion parent : WineRegion.topLevels()) {
            assertThat(parent.children())
                    .allSatisfy(child -> assertThat(child.parent()).isSameAs(parent));
        }
        long childCount = WineRegion.topLevels().stream().mapToLong(r -> r.children().size()).sum();
        long l2Count = java.util.Arrays.stream(WineRegion.values()).filter(r -> !r.isTopLevel()).count();
        assertThat(childCount).isEqualTo(l2Count);
    }

    @Test
    @DisplayName("같은 국가 안에서 한글/영문 이름이 중복되지 않는다")
    void namesAreUniqueWithinCountry() {
        for (String country : WineRegion.countryCodes()) {
            List<WineRegion> regions = java.util.Arrays.stream(WineRegion.values())
                    .filter(r -> r.getCountryCode().equals(country))
                    .toList();
            assertThat(regions).extracting(WineRegion::getNameKo)
                    .as("%s 한글 이름 중복", country)
                    .doesNotHaveDuplicates();
            assertThat(regions).extracting(WineRegion::getNameEn)
                    .as("%s 영문 이름 중복", country)
                    .doesNotHaveDuplicates();
        }
    }

    @Test
    @DisplayName("이름은 비어 있지 않다")
    void namesArePresent() {
        assertThat(WineRegion.values()).allSatisfy(region -> {
            assertThat(region.getNameKo()).as("nameKo of %s", region).isNotBlank();
            assertThat(region.getNameEn()).as("nameEn of %s", region).isNotBlank();
        });
    }

    @Test
    @DisplayName("모든 국가는 최소 1개 L1 을 가지며 6개국 이상이 L2 를 보유한다")
    void everyCountryHasTopLevelsAndSubRegions() {
        Set<String> countriesWithL2 = java.util.Arrays.stream(WineRegion.values())
                .filter(r -> !r.isTopLevel())
                .map(WineRegion::getCountryCode)
                .collect(Collectors.toCollection(HashSet::new));

        for (String country : SUPPORTED_COUNTRIES) {
            assertThat(WineRegion.topLevelsOf(country)).as("%s L1", country).isNotEmpty();
        }
        // 세부산지가 없는 국가(포르투갈·독일 등 L1 만 정의)도 정상이다 — 확대 지도만 생략된다
        assertThat(countriesWithL2).as("L2 보유 국가").isSubsetOf(SUPPORTED_COUNTRIES);
        assertThat(countriesWithL2).hasSizeGreaterThanOrEqualTo(6);
    }

    @Test
    @DisplayName("fromCode 는 알 수 없는 코드에 대해 예외 없이 empty 를 반환한다")
    void fromCodeIsLenient() {
        assertThat(WineRegion.fromCode("FR_BORDEAUX")).contains(WineRegion.FR_BORDEAUX);
        assertThat(WineRegion.fromCode("  FR_BORDEAUX  ")).contains(WineRegion.FR_BORDEAUX);
        assertThat(WineRegion.fromCode("NOPE_UNKNOWN")).isEmpty();
        assertThat(WineRegion.fromCode("")).isEmpty();
        assertThat(WineRegion.fromCode("   ")).isEmpty();
        assertThat(WineRegion.fromCode(null)).isEmpty();
    }

    @Test
    @DisplayName("topLevelsOf 는 선언 순서를 유지하고 알 수 없는 국가는 빈 목록")
    void topLevelsOfKeepsDeclarationOrder() {
        assertThat(WineRegion.topLevelsOf("FR"))
                .startsWith(WineRegion.FR_BORDEAUX, WineRegion.FR_BOURGOGNE, WineRegion.FR_CHAMPAGNE);
        // 카탈로그에 없는 국가 코드 — 산지가 추가되면서 실제 국가가 되지 않도록 예약된 사용자 정의 코드를 쓴다
        assertThat(WineRegion.topLevelsOf("ZZ")).isEmpty();
    }
}
