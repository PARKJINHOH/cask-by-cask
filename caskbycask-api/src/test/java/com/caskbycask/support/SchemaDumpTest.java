package com.caskbycask.support;

import jakarta.persistence.Entity;
import org.hibernate.SessionFactory;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.io.File;

/**
 * V1__init_baseline.sql 재생성용 오프라인 스키마 덤프 유틸리티.
 *
 * <p>현재 모든 JPA 엔티티로부터 MariaDBDialect 가 생성하는 DDL(네이티브 enum 포함)을
 * {@code build/baseline-gen.sql} 로 추출한다. DB 연결 없이 동작하며
 * ({@code jakarta.persistence.schema-generation.database.action=none}),
 * Spring Boot 와 동일한 네이밍 전략을 적용해 컬럼/테이블명을 동일하게 맞춘다.
 *
 * <p>평소 {@code ./gradlew build} 에서는 건너뛴다(시스템 프로퍼티 게이트).
 * 재생성이 필요할 때만 수동 실행:
 * <pre>
 *   ./gradlew :caskbycask-api:test --tests "*SchemaDumpTest" -Dschema.dump=true
 * </pre>
 * 추출 후 각 {@code create table} 에 {@code engine=InnoDB default charset=utf8mb4
 * collate=utf8mb4_unicode_ci} 를 부여하고 정책 헤더를 붙여 V1 로 반영한다.
 */
class SchemaDumpTest {

    private static final String OUTPUT = "build/baseline-gen.sql";
    private static final String BASE_PACKAGE = "com.caskbycask";

    @Test
    void dumpSchema() {
        Assumptions.assumeTrue(
                Boolean.getBoolean("schema.dump"),
                "스키마 덤프는 -Dschema.dump=true 일 때만 실행됩니다.");

        new File(OUTPUT).delete();

        var registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.MariaDBDialect")
                .applySetting("hibernate.physical_naming_strategy",
                        "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy")
                .applySetting("hibernate.implicit_naming_strategy",
                        "org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy")
                // DB 미연결 오프라인 스크립트 생성
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", "false")
                .applySetting("jakarta.persistence.schema-generation.database.action", "none")
                .applySetting("jakarta.persistence.schema-generation.scripts.action", "create")
                .applySetting("jakarta.persistence.schema-generation.scripts.create-target", OUTPUT)
                .applySetting("hibernate.hbm2ddl.delimiter", ";")
                .build();

        MetadataSources sources = new MetadataSources(registry);

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        for (var bd : scanner.findCandidateComponents(BASE_PACKAGE)) {
            try {
                sources.addAnnotatedClass(Class.forName(bd.getBeanClassName()));
            } catch (ClassNotFoundException e) {
                throw new IllegalStateException("엔티티 로드 실패: " + bd.getBeanClassName(), e);
            }
        }

        Metadata metadata = sources.buildMetadata();

        // SessionFactory 생성 시 schema-generation.scripts 설정이 트리거되어 DDL 이 파일로 출력됨.
        try (SessionFactory sf = metadata.buildSessionFactory()) {
            // no-op
        }

        System.out.println("[SchemaDumpTest] DDL written to " + new File(OUTPUT).getAbsolutePath());
    }
}
