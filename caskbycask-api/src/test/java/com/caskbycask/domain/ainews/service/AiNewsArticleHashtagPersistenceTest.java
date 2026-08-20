package com.caskbycask.domain.ainews.service;

import com.caskbycask.admin.service.AdminLogService;
import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.AiNewsArticle;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleStatus;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleType;
import com.caskbycask.domain.ainews.entity.enums.AiNewsCategory;
import com.caskbycask.domain.ainews.repository.*;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.domain.community.service.PostService;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaAuditingConfig.class, QuerydslConfig.class})
class AiNewsArticleHashtagPersistenceTest {

    @Autowired AiNewsArticleRepository articleRepository;
    @Autowired TestEntityManager entityManager;
    @Autowired JdbcTemplate jdbcTemplate;

    private AiNewsService service;

    @BeforeEach
    void setUp() {
        // 운영 Flyway 스키마(V46)의 (article_id, hashtag) 유니크 키를 H2 테스트 스키마에도 재현한다.
        jdbcTemplate.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS uk_test_ai_news_article_hashtags_value
                ON ai_news_article_hashtags (article_id, hashtag)
                """);
        service = new AiNewsService(
                mock(AiNewsSettingsRepository.class), articleRepository,
                mock(AiNewsTopicRepository.class), mock(AiNewsSourceConfigRepository.class),
                mock(AiNewsRunRepository.class), mock(AiNewsUsageRepository.class),
                mock(UserRepository.class), mock(PostService.class),
                mock(PostPrefixRepository.class), mock(AdminLogService.class),
                mock(SocialPublishRequestService.class));
    }

    @Test
    void updateArticleReplacesOverlappingHashtagsWithoutUniqueKeyCollision() {
        AiNewsArticle article = AiNewsArticle.builder()
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(AiNewsArticleStatus.DRAFT)
                .category(AiNewsCategory.WHISKY)
                .title("기존 제목")
                .content("<p>기존 본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("release:hashtag-replacement")
                .build();
        article.replaceHashtags(List.of("위스키", "신제품"));
        Long articleId = articleRepository.saveAndFlush(article).getId();
        entityManager.clear();

        service.updateArticle(articleId, new AiNewsDtos.ArticleAdminUpdateRequest(
                AiNewsCategory.WHISKY, "변경된 제목", "<p>변경된 본문</p>",
                null, false, List.of("신제품", "위스키정보"), null), null);
        articleRepository.flush();
        entityManager.clear();

        AiNewsArticle updated = articleRepository.findDetailById(articleId).orElseThrow();
        assertThat(updated.getTitle()).isEqualTo("변경된 제목");
        assertThat(updated.getHashtags()).containsExactly("신제품", "위스키정보");
    }
}
