package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 메인 "최근 등록된 리뷰" 조회 쿼리 검증.
 * 마스터 주류 단위 중복 제거 + 최신순 정렬 + 노출 가능 대상만 반환하는지 확인한다.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class ReviewRepositoryRecentDistinctQueryTest {

    @Autowired private EntityManager entityManager;
    @Autowired private ReviewRepository reviewRepository;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .email("recent-review@example.com")
                .nickname("recent01")
                .role(Role.MEMBER)
                .build();
        entityManager.persist(user);
    }

    @Test
    @DisplayName("숨김 리뷰와 비 ACTIVE 술의 리뷰는 제외한다")
    void excludeHiddenReviewsAndInactiveSpirits() {
        Spirit active = activeSpirit("Active Spirit");
        Spirit hiddenSpirit = spirit("Hidden Spirit");
        hiddenSpirit.hide();
        entityManager.persist(hiddenSpirit);

        persistReview(active, "visible");

        Review hiddenReview = review(active, "hidden review");
        hiddenReview.hide();
        entityManager.persist(hiddenReview);

        persistReview(hiddenSpirit, "inactive spirit review");
        flushAndClear();

        List<Review> result = reviewRepository.findRecentDistinctBySpirit(PageRequest.of(0, 10));

        assertThat(result)
                .extracting(Review::getComment)
                .containsExactly("visible");
    }

    @Test
    @DisplayName("같은 술에 리뷰가 여러 건이면 최신 1건만 반환한다")
    void keepOnlyLatestReviewPerSpirit() {
        Spirit spiritA = activeSpirit("Spirit A");
        Spirit spiritB = activeSpirit("Spirit B");

        persistReview(spiritA, "A-old");
        persistReview(spiritB, "B-only");
        persistReview(spiritA, "A-new");
        flushAndClear();

        List<Review> result = reviewRepository.findRecentDistinctBySpirit(PageRequest.of(0, 10));

        assertThat(result)
                .extracting(Review::getComment)
                .containsExactly("A-new", "B-only");
    }

    @Test
    @DisplayName("마스터 리뷰와 에디션 리뷰는 마스터 기준 한 건으로 합쳐진다")
    void mergeMasterAndEditionReviewsIntoOneRow() {
        Spirit master = activeSpirit("Master Spirit");
        Spirit edition = activeEdition(master, "Batch 3");
        Spirit other = activeSpirit("Other Spirit");

        persistReview(master, "master-review");
        persistReview(other, "other-review");
        persistReview(edition, "edition-review");
        flushAndClear();

        List<Review> result = reviewRepository.findRecentDistinctBySpirit(PageRequest.of(0, 10));

        assertThat(result)
                .extracting(Review::getComment)
                .containsExactly("edition-review", "other-review");
        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("에디션에 새 리뷰가 등록되면 해당 마스터가 최상단으로 올라온다")
    void newEditionReviewMovesMasterToTop() {
        Spirit master = activeSpirit("Master Spirit");
        Spirit edition = activeEdition(master, "Batch 5");
        Spirit other = activeSpirit("Other Spirit");

        persistReview(master, "master-review");
        persistReview(other, "other-review");
        flushAndClear();

        assertThat(reviewRepository.findRecentDistinctBySpirit(PageRequest.of(0, 10)))
                .extracting(Review::getComment)
                .containsExactly("other-review", "master-review");

        persistReview(entityManager.find(Spirit.class, edition.getId()), "edition-latest");
        flushAndClear();

        assertThat(reviewRepository.findRecentDistinctBySpirit(PageRequest.of(0, 10)))
                .extracting(Review::getComment)
                .containsExactly("edition-latest", "other-review");
    }

    @Test
    @DisplayName("마스터 주류(부모 없음)도 누락 없이 반환하고 size 제한이 적용된다")
    void returnMasterSpiritsAndApplySizeLimit() {
        Spirit first = activeSpirit("Spirit 1");
        Spirit second = activeSpirit("Spirit 2");
        Spirit third = activeSpirit("Spirit 3");

        persistReview(first, "r1");
        persistReview(second, "r2");
        persistReview(third, "r3");
        flushAndClear();

        assertThat(reviewRepository.findRecentDistinctBySpirit(PageRequest.of(0, 10)))
                .extracting(Review::getComment)
                .containsExactly("r3", "r2", "r1");

        assertThat(reviewRepository.findRecentDistinctBySpirit(PageRequest.of(0, 2)))
                .extracting(Review::getComment)
                .containsExactly("r3", "r2");
    }

    // ── fixture helpers ────────────────────────────────────────

    private Spirit spirit(String name) {
        return Spirit.builder()
                .nameKo(name)
                .nameEn(name)
                .category(SpiritCategory.WHISKY)
                .build();
    }

    private Spirit activeSpirit(String name) {
        Spirit spirit = spirit(name);
        spirit.approve();
        entityManager.persist(spirit);
        return spirit;
    }

    private Spirit activeEdition(Spirit parent, String variantValue) {
        Spirit edition = Spirit.builder()
                .nameKo(parent.getNameKo())
                .nameEn(parent.getNameEn())
                .category(parent.getCategory())
                .parent(parent)
                .variantType(VariantType.BATCH)
                .variantValue(variantValue)
                .build();
        edition.approve();
        entityManager.persist(edition);
        return edition;
    }

    private Review review(Spirit spirit, String comment) {
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

    private void persistReview(Spirit spirit, String comment) {
        entityManager.persist(review(spirit, comment));
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
