package com.caskbycask.domain.tastetree;

import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class TasteTreeMigrationSeedTest {

    @Test
    void rebuiltTasteTreeMigrationArchivesLegacyOfficialTreesAndCreatesEngagementTables() throws Exception {
        String sql = readMigration("/db/migration/V45__rebuild_whisky_taste_tree.sql");

        assertThat(sql)
                .contains("CREATE TABLE taste_tree_likes")
                .contains("CONSTRAINT ux_taste_tree_likes_tree_user UNIQUE (tree_id, user_id)")
                .contains("CREATE TABLE taste_tree_daily_views")
                .contains("CONSTRAINT ux_taste_tree_daily_views UNIQUE (tree_id, viewer_key_hash, viewed_date)")
                .contains("SET moderation_status = 'HIDDEN'")
                .contains("SET v.status = 'ARCHIVED'")
                .contains("DROP TABLE taste_tree_results");
    }

    @Test
    void rebuiltTasteTreeMigrationAddsOwnershipCountersAndTreeBoundImages() throws Exception {
        String sql = readMigration("/db/migration/V45__rebuild_whisky_taste_tree.sql");

        assertThat(sql)
                .contains("ADD COLUMN moderation_status")
                .contains("ADD COLUMN created_by_user_id")
                .contains("ADD COLUMN like_count")
                .contains("ADD COLUMN view_count")
                .contains("ALTER TABLE taste_tree_images")
                .contains("ADD COLUMN tree_id")
                .contains("FOREIGN KEY (tree_id) REFERENCES taste_trees (id) ON DELETE CASCADE");
    }

    @Test
    void commonFactsMigrationCreatesTableAndSeedsSeventyFacts() throws Exception {
        String sql = readMigration("/db/migration/V48__create_taste_tree_facts.sql");

        assertThat(sql).contains("CREATE TABLE taste_tree_facts");
        assertThat(sql.lines().filter(line -> line.startsWith("('")).count()).isEqualTo(70);
    }

    private String readMigration(String resourcePath) throws Exception {
        try (InputStream input = getClass().getResourceAsStream(resourcePath)) {
            assertThat(input).isNotNull();
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
