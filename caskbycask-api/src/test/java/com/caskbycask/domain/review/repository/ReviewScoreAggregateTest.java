package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 점수 없는 리뷰는 평균에 끼지 않는다 — 이 동작이 깨지면 주류 점수가 통째로 틀어진다.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class ReviewScoreAggregateTest {

    @Autowired private EntityManager entityManager;
    @Autowired private ReviewRepository reviewRepository;

    @Test
    void unscoredReviewsAreExcludedFromTheAverageButStillCount() {
        User user = persistUser("score-null@example.com", "sc01");
        Spirit spirit = persistSpirit("Unscored Master", null);

        persistReview(user, spirit, new BigDecimal("90"));
        persistReview(user, spirit, new BigDecimal("80"));
        persistReview(user, spirit, null);   // 점수 없는 리뷰
        persistReview(user, spirit, null);
        entityManager.flush();
        entityManager.clear();

        Long id = spirit.getId();
        // 평균은 점수를 남긴 둘만 본다 — 점수 없는 리뷰가 0점으로 끌어내리지 않는다.
        assertThat(reviewRepository.findAvgScoreForMasterSpirit(id)).contains(85.0d);
        assertThat(reviewRepository.countActiveForMasterSpirit(id)).isEqualTo(4L);
        assertThat(reviewRepository.countScoredForMasterSpirit(id)).isEqualTo(2L);
    }

    @Test
    void averageIsNullWhenNoReviewCarriesAScore() {
        User user = persistUser("score-none@example.com", "sc02");
        Spirit spirit = persistSpirit("No Score", null);

        persistReview(user, spirit, null);
        persistReview(user, spirit, null);
        entityManager.flush();
        entityManager.clear();

        Long id = spirit.getId();
        assertThat(reviewRepository.findAvgScoreForMasterSpirit(id)).isEmpty();
        assertThat(reviewRepository.countActiveForMasterSpirit(id)).isEqualTo(2L);
        assertThat(reviewRepository.countScoredForMasterSpirit(id)).isZero();
    }

    @Test
    void clearingScoresOnUpdateDropsTheReviewOutOfTheAverage() {
        User user = persistUser("score-clear@example.com", "sc03");
        Spirit spirit = persistSpirit("Clear Score", null);

        persistReview(user, spirit, new BigDecimal("90"));
        Review scored = persistReview(user, spirit, new BigDecimal("60"));
        entityManager.flush();

        assertThat(reviewRepository.findAvgScoreForMasterSpirit(spirit.getId())).contains(75.0d);

        // 점수를 지우는 수정 — @PreUpdate 가 totalScore 를 null 로 되돌려야 한다.
        scored.update(null, null, null,
                scored.getNoseNote(), scored.getTasteNote(), scored.getFinishNote(),
                scored.getComment(), null, null, null);
        entityManager.flush();
        entityManager.clear();

        assertThat(reviewRepository.findAvgScoreForMasterSpirit(spirit.getId())).contains(90.0d);
        assertThat(reviewRepository.countScoredForMasterSpirit(spirit.getId())).isEqualTo(1L);
    }

    @Test
    void masterAverageSpansChildEditionsAndSkipsTheirUnscoredReviews() {
        User user = persistUser("score-variant@example.com", "sc04");
        Spirit master = persistSpirit("Variant Master", null);
        Spirit variant = persistSpirit("Variant Child", master);

        persistReview(user, master, new BigDecimal("70"));
        persistReview(user, variant, new BigDecimal("90"));
        persistReview(user, variant, null);
        entityManager.flush();
        entityManager.clear();

        assertThat(reviewRepository.findAvgScoreForMasterSpirit(master.getId())).contains(80.0d);
        assertThat(reviewRepository.countScoredForMasterSpirit(master.getId())).isEqualTo(2L);
        assertThat(reviewRepository.countScoredBySpiritId(variant.getId())).isEqualTo(1L);
        assertThat(reviewRepository.countActiveBySpiritId(variant.getId())).isEqualTo(2L);
    }

    // ── helpers ────────────────────────────────────────────

    private User persistUser(String email, String nickname) {
        User user = User.builder().email(email).nickname(nickname).role(Role.MEMBER).build();
        entityManager.persist(user);
        return user;
    }

    private Spirit persistSpirit(String name, Spirit parent) {
        Spirit spirit = Spirit.builder()
                .nameKo(name).nameEn(name).category(SpiritCategory.WHISKY).build();
        spirit.approve();
        if (parent != null) parent.addVariant(spirit);
        entityManager.persist(spirit);
        return spirit;
    }

    /** score 가 null 이면 세 점수를 모두 비운 "점수 없는 리뷰". */
    private Review persistReview(User user, Spirit spirit, BigDecimal score) {
        Review review = Review.builder()
                .user(user).spirit(spirit)
                .noseScore(score).tasteScore(score).finishScore(score)
                .build();
        entityManager.persist(review);
        return review;
    }
}
