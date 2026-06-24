package com.caskbycask.global.init;

import com.caskbycask.domain.spirit.entity.Spirit;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.search.mapper.orm.Search;
import org.hibernate.search.mapper.orm.session.SearchSession;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class SearchIndexInitializer implements ApplicationRunner {

    private final EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("Starting Hibernate Search Mass Indexing...");
        try {
            SearchSession searchSession = Search.session(entityManager);
            searchSession.massIndexer(Spirit.class)
                    .threadsToLoadObjects(4)
                    .startAndWait();
            log.info("Hibernate Search Mass Indexing completed successfully.");
        } catch (InterruptedException e) {
            log.error("Hibernate Search Mass Indexing was interrupted", e);
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.error("Hibernate Search Mass Indexing failed", e);
        }
    }
}
