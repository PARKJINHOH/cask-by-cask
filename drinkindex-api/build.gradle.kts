plugins {
    java
    id("org.springframework.boot") version "3.5.14"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.drinkindex"
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
val jjwtVersion = "0.12.6"

dependencies {
    // Web
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Security
    implementation("org.springframework.boot:spring-boot-starter-security")

    // JPA
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // Redis
    implementation("org.springframework.boot:spring-boot-starter-data-redis")

    // Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // MariaDB
    runtimeOnly("org.mariadb.jdbc:mariadb-java-client")

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
    implementation("org.jsoup:jsoup:1.17.2")

    // SQL 로깅 (local: 파라미터 인라인 + 유저 ID)
    implementation("com.github.gavlyukovskiy:datasource-proxy-spring-boot-starter:1.10.0")

    // Swagger / OpenAPI
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.3")

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
}

// QueryDSL Q클래스 생성 경로
val querydslDir = layout.buildDirectory.dir("generated/querydsl")

sourceSets {
    main {
        java.srcDir(querydslDir)
    }
}

tasks.withType<JavaCompile> {
    options.annotationProcessorGeneratedSourcesDirectory = querydslDir.get().asFile
}

tasks.named<Delete>("clean") {
    delete(querydslDir)
}

tasks.withType<Test> {
    useJUnitPlatform()
}
