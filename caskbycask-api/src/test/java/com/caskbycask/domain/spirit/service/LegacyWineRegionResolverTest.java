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

    /**
     * 시·도 이름을 코드로 잇는 V108 의 백필 표. V68 과 형태가 다르다 —
     * 국내는 카테고리를 가리지 않고 <b>이름만으로</b> 잇기 때문에 (국가, 지역) 두 칸이다.
     */
    private static final Pattern KR_MIGRATION_ROW = Pattern.compile(
            "(?m)^\\s{4}\\('(?<region>[^']+)',\\s*'(?<code>KR_[A-Z0-9_]+)'\\)");

    private static final Set<LegacyValue> INTENTIONALLY_UNMAPPED = Set.of(
            new LegacyValue(SpiritCategory.WINE, "그리스", "산토리니 / 네메아"),
            new LegacyValue(SpiritCategory.WINE, "뉴질랜드", "말버러 / 호크스 베이"),
            // '충청도'는 시도가 아니라 통합 명칭이라 충북·충남 어느 쪽인지 코드로 정할 수 없다.
            // 실제 행은 V108 이 소재지에 맞춰 고쳤지만, 시드 원문은 그대로라 여기 남는다.
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
    @DisplayName("국내 시도는 와인 산지로도 이어진다")
    void resolvesKoreanRegionsForWine() {
        assertThat(resolver.resolve(SpiritCategory.WINE, "대한민국", "경기도"))
                .contains(WineRegion.KR_GYEONGGI);
        assertThat(resolver.resolve(SpiritCategory.WINE, "대한민국", "충청북도"))
                .contains(WineRegion.KR_CHUNGBUK);
    }

    @Test
    @DisplayName("복수 산지와 카테고리 불일치는 자동 매핑하지 않는다")
    void leavesAmbiguousOrUnsupportedValuesUnmapped() {
        assertThat(resolver.resolve(SpiritCategory.WINE, "뉴질랜드", "말버러 / 호크스 베이")).isEmpty();
        // 국내 시도는 WINE·WHISKY·OTHER 만 지원한다. 꼬냑은 프랑스 꼬냑 지방뿐이다.
        assertThat(resolver.resolve(SpiritCategory.COGNAC, "대한민국", "경기도")).isEmpty();
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
    @DisplayName("백필 마이그레이션은 해석 가능한 모든 생산자 시드와 유효한 enum 코드를 포함한다")
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

        // 국내는 V108 이 이어받았다. V68 은 이미 적용된 마이그레이션이라 손대지 않는다 —
        // 뒤에 붙은 백필까지 같이 봐야 "코드가 붙는 값은 전부 백필된다"는 불변식이 성립한다.
        java.util.Map<String, WineRegion> koreanSnapshot = new java.util.HashMap<>();
        Matcher korean = KR_MIGRATION_ROW.matcher(
                readResource("/db/migration/V108__align_korean_region_names.sql"));
        while (korean.find()) {
            koreanSnapshot.put(korean.group("region"), WineRegion.valueOf(korean.group("code")));
        }
        assertThat(koreanSnapshot).as("V108 의 시도 백필 표를 읽지 못했다").isNotEmpty();

        List<String> laterMigrations = readMigrationsAfter(68);

        values.stream().distinct().forEach(value ->
                resolver.resolve(value.category(), value.country(), value.region())
                        .ifPresent(expected ->
                                assertBackfilled(snapshot, koreanSnapshot, laterMigrations, value, expected)));
    }

    /**
     * 리졸버가 코드를 붙이는 값은 <b>기존 행에도</b> 그 코드가 붙어 있어야 한다.
     *
     * <p>표로 읽을 수 있는 두 곳(V68·V108)을 먼저 보고, 거기서 어긋나면 그 뒤 마이그레이션이
     * 코드를 옮겼는지 확인한다. 뒤쪽은 형태가 제각각이라(V110 은 UPDATE 한 줄이다) 표로 파싱하지
     * 않고 "지역 이름과 목표 코드가 한 파일에 함께 있는가"만 본다 — 이 검사의 목적은 SQL 문법을
     * 고정하는 게 아니라 <b>마이그레이션 없이 리졸버만 고치는 실수</b>를 잡는 것이다.
     */
    private void assertBackfilled(java.util.Map<LegacyValue, WineRegion> snapshot,
                                  java.util.Map<String, WineRegion> koreanSnapshot,
                                  List<String> laterMigrations,
                                  LegacyValue value,
                                  WineRegion expected) {
        WineRegion tabled = snapshot.get(value);
        if (tabled == null && "대한민국".equals(value.country())) {
            tabled = koreanSnapshot.get(value.region());
        }
        if (expected == tabled) return;

        assertThat(laterMigrations)
                .as("백필 누락: %s 는 %s 로 해석되는데 이를 반영한 마이그레이션이 없다(표 기준 %s)",
                        value, expected, tabled)
                .anySatisfy(sql -> assertThat(sql)
                        .contains("'" + value.region() + "'")
                        .contains("'" + expected.name() + "'"));
    }

    /** V68 뒤에 온 마이그레이션 본문. 번호 순서는 보지 않는다 — 존재 여부만 확인하면 된다. */
    private List<String> readMigrationsAfter(int version) throws IOException {
        Pattern fileName = Pattern.compile("^V(\\d+)__.+\\.sql$");
        try {
            java.nio.file.Path dir = java.nio.file.Path.of(
                    java.util.Objects.requireNonNull(getClass().getResource("/db/migration")).toURI());
            try (var files = java.nio.file.Files.list(dir)) {
                return files
                        .filter(path -> {
                            Matcher matched = fileName.matcher(path.getFileName().toString());
                            return matched.matches() && Integer.parseInt(matched.group(1)) > version;
                        })
                        .map(path -> {
                            try {
                                return java.nio.file.Files.readString(path, StandardCharsets.UTF_8);
                            } catch (IOException exception) {
                                throw new java.io.UncheckedIOException(exception);
                            }
                        })
                        .toList();
            }
        } catch (java.net.URISyntaxException exception) {
            throw new IOException("마이그레이션 디렉터리를 열 수 없습니다", exception);
        }
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
