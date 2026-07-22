package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class ReviewRepositoryPublicQueryTest {

    @Autowired private EntityManager entityManager;
    @Autowired private ReviewRepository reviewRepository;

    @Test
    void publicUserReviewsExcludeHiddenReviewsAndInactiveSpirits() {
        User user = User.builder()
                .email("public-review@example.com")
                .nickname("public01")
                .role(Role.MEMBER)
                .build();
        entityManager.persist(user);

        Spirit activeSpirit = spirit("Active Spirit");
        activeSpirit.approve();
        entityManager.persist(activeSpirit);

        Spirit hiddenSpirit = spirit("Hidden Spirit");
        hiddenSpirit.hide();
        entityManager.persist(hiddenSpirit);

        Review visible = review(user, activeSpirit, "visible");
        entityManager.persist(visible);

        Review hiddenReview = review(user, activeSpirit, "hidden review");
        hiddenReview.hide();
        entityManager.persist(hiddenReview);

        entityManager.persist(review(user, hiddenSpirit, "hidden spirit"));
        entityManager.flush();
        entityManager.clear();

        Page<Review> result = reviewRepository.findPublicByUserId(user.getId(), PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent())
                .extracting(Review::getComment)
                .containsExactly("visible");
    }

    private Spirit spirit(String name) {
        return Spirit.builder()
                .nameKo(name)
                .nameEn(name)
                .category(SpiritCategory.WHISKY)
                .build();
    }

    private Review review(User user, Spirit spirit, String comment) {
        return Review.builder()
                .user(user)
                .spirit(spirit)
                .noseScore(new BigDecimal("80"))
                .tasteScore(new BigDecimal("80"))
                .finishScore(new BigDecimal("80"))
                .totalScore(new BigDecimal("80"))
                .comment(comment)
                .build();
    }
}
