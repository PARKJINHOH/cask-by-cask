# ─────────────────────────────────────────────────────────────────────────────
# DrinkIndex API — Multi-stage build
# ─────────────────────────────────────────────────────────────────────────────
# Build stage: Gradle wrapper 로 bootJar 생성
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# 의존성 캐시 레이어 분리 — gradle 파일만 먼저 복사
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle ./gradle
RUN chmod +x gradlew
# 의존성 사전 다운로드 (실패해도 무시 — 소스 없이는 일부 task 실패 가능)
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

# 소스 복사 후 bootJar (테스트는 CI 에서 별도 수행)
COPY src ./src
RUN ./gradlew --no-daemon bootJar -x test

# ─────────────────────────────────────────────────────────────────────────────
# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 헬스체크용 wget — alpine 기본 패키지에 포함되어 별도 설치 불필요
RUN addgroup -S app && adduser -S -G app app && \
    mkdir -p /var/drinkindex/uploads /var/drinkindex/logs && \
    chown -R app:app /var/drinkindex /app

COPY --from=builder --chown=app:app /workspace/build/libs/*.jar /app/app.jar

USER app
EXPOSE 8080 8081

# Spring Boot Actuator readiness 기반 헬스체크 — 60초 grace
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8081/actuator/health/readiness 2>/dev/null | grep -q '"status":"UP"' || exit 1

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
