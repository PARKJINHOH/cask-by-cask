package com.caskbycask.domain.producer.migration;

import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class KoreanSojuProducerSeedMigrationTest {

    private static final ClassPathResource MIGRATION = new ClassPathResource(
            "db/migration/V101__seed_korean_soju_producers.sql");

    private static final Pattern KOREAN_RESEARCH_META = Pattern.compile(
            "202\\d|조사\\s*시점|교차\\s*확인|확인(?:했|됩|되|한|이|을|된|됨|\\s*필요)"
                    + "|공개\\s*(?:자료|목록|제품|카탈로그|출처)|국세청|K-SUUL|근거|검증");

    private static final Pattern ENGLISH_RESEARCH_META = Pattern.compile(
            "202\\d|cross[- ]?check|public sources?|government sources?|during the .*review"
                    + "|confirm(?:ed|ation)?|verification|research|public (?:list|catalog|information)",
            Pattern.CASE_INSENSITIVE);

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("확정된 소주 제조사 65개를 중복 없이 DB에 적재하고 소개문에는 조사 메타 문구를 넣지 않는다")
    void seedsConfirmedSojuProducersIdempotently() {
        executeMigration();

        assertThat(seedCount()).isEqualTo(65);
        assertThat(jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM producer
                WHERE type = 'OTHER'
                  AND country = '대한민국'
                  AND region IS NOT NULL
                  AND region_code IS NULL
                """, Integer.class)).isZero();

        List<Introduction> introductions = jdbcTemplate.query("""
                SELECT description_ko, description_en
                FROM producer
                WHERE type = 'OTHER' AND country = '대한민국'
                """, (rs, rowNum) -> new Introduction(
                rs.getString("description_ko"),
                rs.getString("description_en")));

        assertThat(introductions).hasSize(65).allSatisfy(introduction -> {
            assertThat(introduction.ko()).isNotBlank();
            assertThat(introduction.en()).isNotBlank();
            assertThat(KOREAN_RESEARCH_META.matcher(introduction.ko()).find()).isFalse();
            assertThat(ENGLISH_RESEARCH_META.matcher(introduction.en()).find()).isFalse();
        });

        assertThat(jdbcTemplate.queryForObject("""
                SELECT description_ko
                FROM producer
                WHERE name_ko = '하이트진로㈜'
                """, String.class))
                .contains("참이슬", "일품진로", "소주와 맥주")
                .doesNotContain("국세청", "확인");

        executeMigration();
        assertThat(seedCount()).isEqualTo(65);
    }

    private void executeMigration() {
        Connection connection = DataSourceUtils.getConnection(dataSource);
        try {
            ScriptUtils.executeSqlScript(connection, MIGRATION);
        } finally {
            DataSourceUtils.releaseConnection(connection, dataSource);
        }
    }

    private int seedCount() {
        return jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM producer
                WHERE type = 'OTHER' AND country = '대한민국'
                """, Integer.class);
    }

    private record Introduction(String ko, String en) {}
}
