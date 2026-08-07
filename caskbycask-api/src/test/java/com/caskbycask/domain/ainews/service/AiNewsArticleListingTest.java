package com.caskbycask.domain.ainews.service;

import com.caskbycask.admin.service.AdminLogService;
import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.AiNewsArticle;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleStatus;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleType;
import com.caskbycask.domain.ainews.entity.enums.AiNewsCategory;
import com.caskbycask.domain.ainews.repository.*;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.domain.community.service.PostImageService;
import com.caskbycask.domain.community.service.PostService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaAuditingConfig.class, QuerydslConfig.class})
class AiNewsArticleListingTest {

    @Autowired AiNewsArticleRepository articleRepository;
    @Autowired TestEntityManager entityManager;

    private AiNewsService service;

    @BeforeEach
    void setUp() {
        service = new AiNewsService(
                mock(AiNewsSettingsRepository.class), articleRepository,
                mock(AiNewsTopicRepository.class), mock(AiNewsSourceConfigRepository.class),
                mock(AiNewsRunRepository.class), mock(AiNewsUsageRepository.class),
                mock(UserRepository.class), mock(ProducerRepository.class),
                mock(PostService.class), mock(PostImageService.class),
                mock(PostPrefixRepository.class), mock(AdminLogService.class),
                mock(SocialPublishRequestService.class));
        save("published", AiNewsArticleStatus.PUBLISHED);
        save("deleted", AiNewsArticleStatus.DELETED);
        entityManager.clear();
    }

    @Test
    void allStatusListingHidesDeletedArticles() {
        List<AiNewsArticleStatus> statuses = service.listArticles(null, null, null, null, null, 0, 20)
                .map(AiNewsDtos.ArticleSummaryResponse::status)
                .getContent();

        assertThat(statuses).containsExactly(AiNewsArticleStatus.PUBLISHED);
    }

    @Test
    void deletedStatusFilterStillReturnsDeletedArticles() {
        List<AiNewsArticleStatus> statuses = service
                .listArticles(AiNewsArticleStatus.DELETED, null, null, null, null, 0, 20)
                .map(AiNewsDtos.ArticleSummaryResponse::status)
                .getContent();

        assertThat(statuses).containsExactly(AiNewsArticleStatus.DELETED);
    }

    private void save(String key, AiNewsArticleStatus status) {
        articleRepository.saveAndFlush(AiNewsArticle.builder()
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(status)
                .category(AiNewsCategory.WHISKY)
                .title(key)
                .content("<p>" + key + "</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("release:" + key)
                .build());
    }
}
