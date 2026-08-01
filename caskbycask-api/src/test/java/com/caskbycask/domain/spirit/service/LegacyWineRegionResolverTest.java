package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class LegacyWineRegionResolverTest {

    private static final Pattern PRODUCER_ROW = Pattern.compile(
            "(?m)^\\((?<nameKo>'(?:''|[^'])*'),\\s*(?<nameEn>'(?:''|[^'])*'),\\s*"
                    + "(?<country>'(?:''|[^'])*'),\\s*(?<region>NULL|'(?:''|[^'])*'),");
    private static final Pattern MIGRATION_MAPPING_ROW = Pattern.compile(
            "(?m)^\\s{4}\\('(?<category>[A-Z]+)', '(?<country>(?:''|[^'])*)', "
                    + "'(?<region>(?:''|[^'])*)', '(?<code>[A-Z0-9_]+)', '(?<canonical>(?:''|[^'])*)'\\)");

    private static final Set<LegacyValue> INTENTIONALLY_UNMAPPED = Set.of(
            new LegacyValue(SpiritCategory.WINE, "그리스", "산토리니 / 네메아"),
            new LegacyValue(SpiritCategory.WINE, "뉴질랜드", "말버러 / 호크스 베이"),
            new LegacyValue(SpiritCategory.WINE, "대한민국", "경기도"),
            new LegacyValue(SpiritCategory.WINE, "대한민국", "충청도"),
            new LegacyValue(SpiritCategory.WINE, "영국", "잉글랜드"),
            new LegacyValue(SpiritCategory.WINE, "포르투갈", "도루 / 다웅")
    );

    private final LegacyWineRegionResolver resolver = new LegacyWineRegionResolver();

    @Test
    @DisplayName("기존 맥캘란의 영문 산지를 스페이사이드 코드로 연결한다")
    void resolvesMacallanSpeyside() {
        assertThat(resolver.resolve(SpiritCategory.WHISKY, "스코틀랜드", "Speyside"))
                .contains(WineRegion.GB_SCT_SPEYSIDE);
    }

    @Test
    @DisplayName("검증된 세부 표기는 가장 깊은 기존 카탈로그 코드로 연결한다")
    void resolvesKnownSpecificAliases() {
        assertThat(resolver.resolve(SpiritCategory.WINE, "미국", "나파 밸리 (오크빌)"))
                .contains(WineRegion.US_CALIFORNIA_NAPA_VALLEY);
        assertThat(resolver.resolve(SpiritCategory.WINE, "프랑스", "루아르 (부브레)"))
                .contains(WineRegion.FR_LOIRE_VOUVRAY);
        assertThat(resolver.resolve(SpiritCategory.WHISKY, "아일랜드", "라우스 (던도크)"))
                .contains(WineRegion.IE_LOUTH);
    }

    @Test
    @DisplayName("복수 산지와 카테고리 불일치는 자동 매핑하지 않는다")
    void leavesAmbiguousOrUnsupportedValuesUnmapped() {
        assertThat(resolver.resolve(SpiritCategory.WINE, "뉴질랜드", "말버러 / 호크스 베이")).isEmpty();
        assertThat(resolver.resolve(SpiritCategory.WINE, "대한민국", "경기도")).isEmpty();
        assertThat(resolver.resolve(SpiritCategory.WHISKY, "미국", "나파 밸리")).isEmpty();
    }

    @Test
    @DisplayName("V4~V6 생산자 시드의 모든 지역은 단일 코드 또는 의도적 미매핑으로 분류된다")
    void classifiesEverySeededProducerRegion() throws IOException {
        List<LegacyValue> values = new ArrayList<>();
        values.addAll(readSeed("/db/migration/V4__seed_producer_distillery.sql", SpiritCategory.WHISKY));
        values.addAll(readSeed("/db/migration/V5__seed_producer_winery.sql", SpiritCategory.WINE));
        values.addAll(readSeed("/db/migration/V6__seed_producer_cognac.sql", SpiritCategory.COGNAC));

        Set<LegacyValue> unresolved = values.stream()
                .filter(value -> resolver.resolve(value.category(), value.country(), value.region()).isEmpty())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(unresolved).containsExactlyInAnyOrderElementsOf(INTENTIONALLY_UNMAPPED);
    }

    @Test
    @DisplayName("V68 호환 스냅샷은 해석 가능한 모든 생산자 시드와 유효한 enum 코드를 포함한다")
    void migrationSnapshotMatchesResolver() throws IOException {
        List<LegacyValue> values = new ArrayList<>();
        values.addAll(readSeed("/db/migration/V4__seed_producer_distillery.sql", SpiritCategory.WHISKY));
        values.addAll(readSeed("/db/migration/V5__seed_producer_winery.sql", SpiritCategory.WINE));
        values.addAll(readSeed("/db/migration/V6__seed_producer_cognac.sql", SpiritCategory.COGNAC));

        String migration = readResource("/db/migration/V68__backfill_legacy_region_codes.sql");
        Matcher matcher = MIGRATION_MAPPING_ROW.matcher(migration);
        java.util.Map<LegacyValue, WineRegion> snapshot = new java.util.HashMap<>();
        while (matcher.find()) {
            SpiritCategory category = SpiritCategory.valueOf(matcher.group("category"));
            WineRegion target = WineRegion.valueOf(matcher.group("code"));
            assertThat(target.supports(category))
                    .as("카테고리와 코드가 일치해야 한다: %s", matcher.group())
                    .isTrue();
            LegacyValue key = new LegacyValue(
                    category,
                    matcher.group("country").replace("''", "'"),
                    matcher.group("region").replace("''", "'"));
            assertThat(snapshot.putIfAbsent(key, target))
                    .as("마이그레이션 키가 중복되면 안 된다: %s", key)
                    .isNull();
        }

        values.stream().distinct().forEach(value ->
                resolver.resolve(value.category(), value.country(), value.region())
                        .ifPresent(expected -> assertThat(snapshot.get(value))
                                .as("V68 누락/불일치: %s", value)
                                .isEqualTo(expected)));
    }

    private List<LegacyValue> readSeed(String resource, SpiritCategory category) throws IOException {
        String sql = readResource(resource);
        Matcher matcher = PRODUCER_ROW.matcher(sql);
        List<LegacyValue> values = new ArrayList<>();
        while (matcher.find()) {
            if (!"NULL".equals(matcher.group("region"))) {
                values.add(new LegacyValue(
                        category,
                        sqlString(matcher.group("country")),
                        sqlString(matcher.group("region"))));
            }
        }
        return values;
    }

    private String readResource(String resource) throws IOException {
        try (var stream = getClass().getResourceAsStream(resource)) {
            if (stream == null) throw new IOException("리소스를 찾을 수 없습니다: " + resource);
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String sqlString(String literal) {
        return literal.substring(1, literal.length() - 1).replace("''", "'");
    }

    private record LegacyValue(SpiritCategory category, String country, String region) {}
}
