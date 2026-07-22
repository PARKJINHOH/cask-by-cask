plugins {
    java
    id("org.springframework.boot") version "3.5.16"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.caskbycask"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

val queryDslVersion = "5.1.0"
val jjwtVersion = "0.13.0"
val bucket4jVersion = "8.19.0"
val hibernateSearchVersion = "7.2.6.Final"

dependencies {
    // Web
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Security
    implementation("org.springframework.boot:spring-boot-starter-security")

    // JPA
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // Redis
    implementation("org.springframework.boot:spring-boot-starter-data-redis")

    // Cache (Caffeine) — 인증 hot-path 사용자 조회 단TTL 캐싱
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("com.github.ben-manes.caffeine:caffeine")

    // Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // MariaDB
    runtimeOnly("org.mariadb.jdbc:mariadb-java-client")

    implementation("org.flywaydb:flyway-core:12.8.1")
    implementation("org.flywaydb:flyway-mysql:12.8.1")

    // Rate Limiting (Bucket4j + Redis Lettuce)
    implementation("com.bucket4j:bucket4j_jdk17-core:$bucket4jVersion")
    implementation("com.bucket4j:bucket4j_jdk17-lettuce:$bucket4jVersion")

    // Actuator + Prometheus 메트릭 (관리 포트 8081 분리 노출)
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("io.micrometer:micrometer-registry-prometheus")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jjwtVersion")

    // QueryDSL
    implementation("com.querydsl:querydsl-jpa:$queryDslVersion:jakarta")
    annotationProcessor("com.querydsl:querydsl-apt:$queryDslVersion:jakarta")
    annotationProcessor("jakarta.annotation:jakarta.annotation-api")
    annotationProcessor("jakarta.persistence:jakarta.persistence-api")

    // Email
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // HTML Sanitizer — XSS 방어 (공지사항 TipTap 콘텐츠 서버 측 재검증)
    implementation("org.jsoup:jsoup:1.22.2")

    // WebP 인코딩 (이미지 업로드 시 .webp 변환본 생성)
    // 원본 JPG/PNG 는 서버에 보관, 브라우저에는 WebP 서빙
    implementation("com.sksamuel.scrimage:scrimage-core:4.6.4")
    implementation("com.sksamuel.scrimage:scrimage-webp:4.6.4")

    // SQL 로깅 (local: 파라미터 인라인 + 유저 ID)
    implementation("com.github.gavlyukovskiy:datasource-proxy-spring-boot-starter:1.12.1")

    // Swagger / OpenAPI
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.17")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testRuntimeOnly("com.h2database:h2")
    testCompileOnly("org.projectlombok:lombok")
    testAnnotationProcessor("org.projectlombok:lombok")

    // Hibernate Search (Embedded Lucene) & Nori 한글 분석기
    implementation(platform("org.hibernate.search:hibernate-search-bom:$hibernateSearchVersion"))
    implementation("org.hibernate.search:hibernate-search-mapper-orm")
    implementation("org.hibernate.search:hibernate-search-backend-lucene")
    implementation("org.apache.lucene:lucene-analysis-nori:9.11.1")
}

// QueryDSL Q클래스 생성 경로
val querydslDir = layout.buildDirectory.dir("generated/querydsl")

sourceSets {
    main {
        java.srcDir(querydslDir)
    }
}

tasks.withType<JavaCompile> {
    options.generatedSourceOutputDirectory.set(querydslDir)
}

tasks.named<Delete>("clean") {
    delete(querydslDir)
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Keep JUnit @TempDir under the project build directory. On Windows CI and
    // sandboxed runners the user-level temp directory may fail during cleanup.
    systemProperty(
        "java.io.tmpdir",
        layout.buildDirectory.dir("tmp/test").get().asFile.absolutePath
    )
    // SchemaDumpTest 게이트 프로퍼티 전달 (-Dschema.dump=true 일 때만 베이스라인 DDL 재생성)
    systemProperty("schema.dump", System.getProperty("schema.dump") ?: "false")
}
