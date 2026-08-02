package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 사용자 공개 리뷰 목록의 카테고리·키워드 서버 필터와 카테고리별 집계 검증.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class ReviewQueryRepositoryTest {

    @Autowired private EntityManager entityManager;
    @Autowired private ReviewRepository reviewRepository;

    private User owner;
    private User other;

    @BeforeEach
    void setUp() {
        owner = persistUser("owner@example.com", "owner01");
        other = persistUser("other@example.com", "other01");

        // 위스키 3건 (그중 1건은 숨김 리뷰 → 제외 대상)
        Spirit balvenie = persistActiveSpirit("발베니 12년 더블우드", "Balvenie 12 DoubleWood", SpiritCategory.WHISKY);
        Spirit lagavulin = persistActiveSpirit("라가불린 16년", "Lagavulin 16", SpiritCategory.WHISKY);
        entityManager.persist(review(owner, balvenie, "balvenie-1"));
        entityManager.persist(review(owner, lagavulin, "lagavulin-1"));
        Review hiddenWhisky = review(owner, balvenie, "hidden-whisky");
        hiddenWhisky.hide();
        entityManager.persist(hiddenWhisky);

        // 꼬냑 1건
        Spirit remy = persistActiveSpirit("레미 마르탱 XO", "Remy Martin XO", SpiritCategory.COGNAC);
        entityManager.persist(review(owner, remy, "cognac-1"));

        // 와인 1건
        Spirit margaux = persistActiveSpirit("샤또 마고", "Chateau Margaux", SpiritCategory.WINE);
        entityManager.persist(review(owner, margaux, "wine-1"));

        // 비-ACTIVE 주류(기타) 리뷰 → 제외 대상
        Spirit pendingOther = Spirit.builder()
                .nameKo("숨김 기타주")
                .nameEn("Hidden Other")
                .category(SpiritCategory.OTHER)
                .build();
        pendingOther.hide();
        entityManager.persist(pendingOther);
        entityManager.persist(review(owner, pendingOther, "other-hidden"));

        // 타인 리뷰 → 제외 대상 (userId 필터 검증)
        entityManager.persist(review(other, balvenie, "other-user"));

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("필터 없이 조회하면 본인의 공개 리뷰만 최신순으로 반환한다")
    void searchWithoutFilterReturnsOnlyOwnPublicReviews() {
        Page<Review> result = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, null, PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(4);
        assertThat(result.getContent())
                .extracting(Review::getComment)
                .containsExactlyInAnyOrder("balvenie-1", "lagavulin-1", "cognac-1", "wine-1");
    }

    @Test
    @DisplayName("최신순(createdAt DESC, id DESC) 정렬로 반환한다")
    void searchReturnsLatestFirst() {
        Page<Review> result = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, null, PageRequest.of(0, 10));

        assertThat(result.getContent())
                .extracting(Review::getId)
                .isSortedAccordingTo((a, b) -> Long.compare(b, a));
    }

    @Test
    @DisplayName("카테고리 필터는 해당 카테고리 리뷰만 반환한다")
    void searchFiltersByCategory() {
        Page<Review> whisky = reviewRepository.searchPublicUserReviews(
                owner.getId(), SpiritCategory.WHISKY, null, PageRequest.of(0, 10));
        assertThat(whisky.getTotalElements()).isEqualTo(2);
        assertThat(whisky.getContent())
                .extracting(Review::getComment)
                .containsExactlyInAnyOrder("balvenie-1", "lagavulin-1");

        Page<Review> cognac = reviewRepository.searchPublicUserReviews(
                owner.getId(), SpiritCategory.COGNAC, null, PageRequest.of(0, 10));
        assertThat(cognac.getTotalElements()).isEqualTo(1);

        // 비-ACTIVE 주류만 있는 카테고리는 0건
        Page<Review> other = reviewRepository.searchPublicUserReviews(
                owner.getId(), SpiritCategory.OTHER, null, PageRequest.of(0, 10));
        assertThat(other.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("키워드는 한글명·영문명 모두 부분 일치로 매칭한다")
    void searchMatchesKeywordOnBothNames() {
        Page<Review> byKo = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, "발베니", PageRequest.of(0, 10));
        assertThat(byKo.getTotalElements()).isEqualTo(1);
        assertThat(byKo.getContent()).extracting(Review::getComment).containsExactly("balvenie-1");

        Page<Review> byEn = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, "Lagavulin", PageRequest.of(0, 10));
        assertThat(byEn.getTotalElements()).isEqualTo(1);
        assertThat(byEn.getContent()).extracting(Review::getComment).containsExactly("lagavulin-1");
    }

    @Test
    @DisplayName("키워드는 대소문자를 무시하고 앞뒤 공백을 제거한다")
    void searchKeywordIsCaseInsensitiveAndTrimmed() {
        Page<Review> lower = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, "  balvenie  ", PageRequest.of(0, 10));
        assertThat(lower.getTotalElements()).isEqualTo(1);

        Page<Review> upper = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, "REMY", PageRequest.of(0, 10));
        assertThat(upper.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("키워드가 null·빈 문자열·공백이면 필터를 적용하지 않는다")
    void searchIgnoresBlankKeyword() {
        assertThat(reviewRepository.searchPublicUserReviews(
                owner.getId(), null, "", PageRequest.of(0, 10)).getTotalElements()).isEqualTo(4);
        assertThat(reviewRepository.searchPublicUserReviews(
                owner.getId(), null, "   ", PageRequest.of(0, 10)).getTotalElements()).isEqualTo(4);
        assertThat(reviewRepository.searchPublicUserReviews(
                owner.getId(), null, null, PageRequest.of(0, 10)).getTotalElements()).isEqualTo(4);
    }

    @Test
    @DisplayName("카테고리와 키워드를 함께 적용할 수 있다")
    void searchCombinesCategoryAndKeyword() {
        Page<Review> matched = reviewRepository.searchPublicUserReviews(
                owner.getId(), SpiritCategory.WHISKY, "발베니", PageRequest.of(0, 10));
        assertThat(matched.getTotalElements()).isEqualTo(1);

        Page<Review> mismatched = reviewRepository.searchPublicUserReviews(
                owner.getId(), SpiritCategory.COGNAC, "발베니", PageRequest.of(0, 10));
        assertThat(mismatched.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("필터가 적용된 상태에서도 totalElements·totalPages 가 정확하다")
    void searchReturnsAccuratePagingMetadata() {
        Page<Review> firstPage = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, null, PageRequest.of(0, 3));

        assertThat(firstPage.getTotalElements()).isEqualTo(4);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.getContent()).hasSize(3);

        Page<Review> secondPage = reviewRepository.searchPublicUserReviews(
                owner.getId(), null, null, PageRequest.of(1, 3));
        assertThat(secondPage.getContent()).hasSize(1);
        assertThat(secondPage.getTotalElements()).isEqualTo(4);
    }

    @Test
    @DisplayName("카테고리별 집계는 리뷰가 없는 카테고리도 0으로 반환한다")
    void countByCategoryFillsMissingCategoriesWithZero() {
        Map<SpiritCategory, Long> counts = reviewRepository.countPublicUserReviewsByCategory(owner.getId());

        assertThat(counts).hasSize(SpiritCategory.values().length);
        assertThat(counts.get(SpiritCategory.WHISKY)).isEqualTo(2L);
        assertThat(counts.get(SpiritCategory.COGNAC)).isEqualTo(1L);
        assertThat(counts.get(SpiritCategory.WINE)).isEqualTo(1L);
        assertThat(counts.get(SpiritCategory.OTHER)).isZero();
        assertThat(counts.values().stream().mapToLong(Long::longValue).sum()).isEqualTo(4L);
    }

    @Test
    @DisplayName("리뷰가 전혀 없는 사용자의 집계는 모두 0이다")
    void countByCategoryForUserWithoutReviews() {
        User empty = persistUser("empty@example.com", "empty01");
        entityManager.flush();
        entityManager.clear();

        Map<SpiritCategory, Long> counts = reviewRepository.countPublicUserReviewsByCategory(empty.getId());

        assertThat(counts).hasSize(SpiritCategory.values().length);
        assertThat(counts.values()).allMatch(count -> count == 0L);
    }

    @Test
    @DisplayName("내 리뷰 목록은 숨김 리뷰·비ACTIVE 주류 리뷰까지 본인 것 전부를 최신순으로 반환한다")
    void searchMyReviewsReturnsAllOwnReviews() {
        Page<Review> result = reviewRepository.searchMyReviews(owner.getId(), null, PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(6);
        assertThat(result.getContent())
                .extracting(Review::getComment)
                .containsExactlyInAnyOrder(
                        "balvenie-1", "lagavulin-1", "hidden-whisky", "cognac-1", "wine-1", "other-hidden");
        assertThat(result.getContent())
                .extracting(Review::getId)
                .isSortedAccordingTo((a, b) -> Long.compare(b, a));
    }

    @Test
    @DisplayName("내 리뷰 목록의 카테고리 필터는 해당 카테고리만 반환하고 페이징 메타데이터도 정확하다")
    void searchMyReviewsFiltersByCategory() {
        Page<Review> whisky = reviewRepository.searchMyReviews(
                owner.getId(), SpiritCategory.WHISKY, PageRequest.of(0, 2));
        assertThat(whisky.getTotalElements()).isEqualTo(3);
        assertThat(whisky.getTotalPages()).isEqualTo(2);
        assertThat(whisky.getContent()).hasSize(2);

        // 공개 목록에서는 제외되는 비ACTIVE 주류도 내 리뷰에서는 조회된다
        Page<Review> other = reviewRepository.searchMyReviews(
                owner.getId(), SpiritCategory.OTHER, PageRequest.of(0, 10));
        assertThat(other.getContent()).extracting(Review::getComment).containsExactly("other-hidden");
    }

    @Test
    @DisplayName("내 리뷰 목록은 타인 리뷰를 반환하지 않는다")
    void searchMyReviewsExcludesOtherUsers() {
        Page<Review> result = reviewRepository.searchMyReviews(other.getId(), null, PageRequest.of(0, 10));

        assertThat(result.getContent()).extracting(Review::getComment).containsExactly("other-user");
    }

    @Test
    @DisplayName("내 리뷰 카테고리 집계는 숨김·비ACTIVE 건까지 포함하고 없는 카테고리는 0이다")
    void countMyReviewsByCategoryIncludesNonPublicReviews() {
        Map<SpiritCategory, Long> counts = reviewRepository.countMyReviewsByCategory(owner.getId());

        assertThat(counts).hasSize(SpiritCategory.values().length);
        assertThat(counts.get(SpiritCategory.WHISKY)).isEqualTo(3L);
        assertThat(counts.get(SpiritCategory.COGNAC)).isEqualTo(1L);
        assertThat(counts.get(SpiritCategory.WINE)).isEqualTo(1L);
        assertThat(counts.get(SpiritCategory.OTHER)).isEqualTo(1L);

        Map<SpiritCategory, Long> emptyCounts =
                reviewRepository.countMyReviewsByCategory(persistUser("none@example.com", "none01").getId());
        assertThat(emptyCounts.values()).allMatch(count -> count == 0L);
    }

    private User persistUser(String email, String nickname) {
        User user = User.builder()
                .email(email)
                .nickname(nickname)
                .role(Role.MEMBER)
                .build();
        entityManager.persist(user);
        return user;
    }

    private Spirit persistActiveSpirit(String nameKo, String nameEn, SpiritCategory category) {
        Spirit spirit = Spirit.builder()
                .nameKo(nameKo)
                .nameEn(nameEn)
                .category(category)
                .build();
        spirit.approve();
        entityManager.persist(spirit);
        return spirit;
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
