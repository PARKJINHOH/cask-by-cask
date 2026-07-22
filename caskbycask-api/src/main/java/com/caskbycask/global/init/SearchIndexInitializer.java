package com.caskbycask.global.init;

import com.caskbycask.domain.spirit.entity.Spirit;
import jakarta.persistence.EntityManager;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.search.mapper.orm.Search;
import org.hibernate.search.mapper.orm.session.SearchSession;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.atomic.AtomicReference;

@Component("searchIndex")
@Slf4j
public class SearchIndexInitializer implements ApplicationRunner, HealthIndicator {

    private final EntityManager entityManager;
    private final int threadsToLoadObjects;
    private final AtomicReference<Status> indexingStatus = new AtomicReference<>(Status.DOWN);

    public SearchIndexInitializer(
            EntityManager entityManager,
            @Value("${search.mass-index-on-startup.threads-to-load-objects:4}") int threadsToLoadObjects
    ) {
        if (threadsToLoadObjects < 1 || threadsToLoadObjects > 16) {
            throw new IllegalArgumentException(
                    "search.mass-index-on-startup.threads-to-load-objects must be between 1 and 16"
            );
        }
        this.entityManager = entityManager;
        this.threadsToLoadObjects = threadsToLoadObjects;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("Starting Hibernate Search Mass Indexing...");
        try {
            rebuildIndex();
            indexingStatus.set(Status.UP);
            log.info("Hibernate Search Mass Indexing completed successfully.");
        } catch (InterruptedException e) {
            indexingStatus.set(Status.DOWN);
            log.error("Hibernate Search Mass Indexing was interrupted", e);
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Hibernate Search Mass Indexing was interrupted", e);
        } catch (Exception e) {
            // API 자체는 기동해 비검색 기능의 가용성을 유지하되 readiness를 DOWN으로 둔다.
            // 배포 스크립트는 readiness 실패로 새 JAR을 롤백하며, 일반 재부팅에서는
            // systemd 무한 재시작 대신 운영자가 검색 장애를 명확히 확인할 수 있다.
            indexingStatus.set(Status.DOWN);
            log.error("Hibernate Search Mass Indexing failed; search readiness remains DOWN", e);
        }
    }

    @Override
    public Health health() {
        return Health.status(indexingStatus.get()).build();
    }

    /**
     * 테스트에서 실패 전파를 검증할 수 있도록 실제 재색인 호출을 분리한다.
     */
    void rebuildIndex() throws InterruptedException {
        SearchSession searchSession = Search.session(entityManager);
        searchSession.massIndexer(Spirit.class)
                .threadsToLoadObjects(threadsToLoadObjects)
                .startAndWait();
    }
}
