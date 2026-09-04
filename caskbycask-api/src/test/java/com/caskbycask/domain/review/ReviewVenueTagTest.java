package com.caskbycask.domain.review;

import com.caskbycask.domain.review.dto.ReviewResponse;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.VenueCity;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
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

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 리뷰의 "마신 곳" 태그 — <b>이 기능 전체에서 운영 회귀 확률이 가장 높은 지점</b>.
 *
 * <p>지키는 것은 둘이다:
 * <ol>
 *   <li><b>N+1 이 아니어야 한다.</b> 리뷰 목록은 열 곳 넘는 쿼리 경로에서 만들어지는데,
 *       그 전부에 fetch join 을 넣고 앞으로도 빠뜨리지 않기를 기대할 수는 없다.
 *       그래서 {@code Venue}·{@code VenueCity} 에 클래스 레벨 {@code @BatchSize} 를 걸었고,
 *       이 테스트가 그 보호막이 벗겨지는 순간을 잡는다.</li>
 *   <li><b>장소가 사라져도 리뷰 목록이 죽지 않아야 한다.</b> {@code Venue} 에는
 *       {@code @SQLRestriction("deleted_at IS NULL")} 이 걸려 있어, 태그된 장소를 지운 뒤
 *       지연 프록시를 건드리면 초기화가 실패할 수 있다. 리뷰 하나 때문에 목록이 통째로
 *       500 이 되면 안 된다.</li>
 * </ol>
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class ReviewVenueTagTest {

    /** 리뷰 20건이면 N+1 이 있을 때와 없을 때의 쿼리 수가 확실히 갈린다. */
    private static final int REVIEW_COUNT = 20;

    @Autowired
    private ReviewRepository reviewRepository;
    @Autowired
    private EntityManager entityManager;

    private Spirit spirit;
    private User user;
    private VenueCity seoul;

    @BeforeEach
    void setUp() {
        user = User.builder().email("venue-tag@example.com").nickname("tagger").role(Role.MEMBER).build();
        entityManager.persist(user);

        spirit = Spirit.builder().nameKo("라프로익 10년").nameEn("Laphroaig 10").category(SpiritCategory.WHISKY).build();
        spirit.approve();
        entityManager.persist(spirit);

        seoul = VenueCity.builder()
                .countryCode("kr").slug("seoul").nameKo("서울").nameEn("Seoul")
                .centerLat(new BigDecimal("37.5665000")).centerLng(new BigDecimal("126.9780000"))
                .build();
        entityManager.persist(seoul);
    }

    private Venue persistVenue(String name, VenueStatus status) {
        Venue venue = Venue.builder()
                .city(seoul).countryCode("kr")
                .venueType(VenueType.BAR).status(status)
                .nameKo(name).address("서울시 강남구")
                .lat(new BigDecimal("37.4979000")).lng(new BigDecimal("127.0276000"))
                .build();
        entityManager.persist(venue);
        return venue;
    }

    private Review persistReview(Venue venue) {
        Review review = Review.builder().user(user).spirit(spirit).venue(venue).build();
        entityManager.persist(review);
        return review;
    }

    private Statistics statistics() {
        return entityManager.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
    }

    @Test
    @DisplayName("리뷰 목록에서 마신 곳을 읽어도 쿼리 수가 건수에 비례하지 않는다")
    void venueTagDoesNotCauseNPlusOne() {
        // 장소를 리뷰마다 다르게 둔다 — 같은 장소면 1차 캐시가 N+1 을 가려 버린다.
        for (int i = 0; i < REVIEW_COUNT; i++) {
            persistReview(persistVenue("바 " + i, VenueStatus.ACTIVE));
        }
        entityManager.flush();
        entityManager.clear();

        Statistics stats = statistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        Page<Review> page = reviewRepository.findBySpiritForDisplay(
                spirit.getId(), PageRequest.of(0, REVIEW_COUNT));
        // 응답 DTO 로 바꾸는 순간 장소·도시를 실제로 만진다 — 여기서 프록시가 깨어난다.
        List<ReviewResponse> responses = page.getContent().stream().map(ReviewResponse::from).toList();

        long queries = stats.getPrepareStatementCount();
        assertThat(responses).hasSize(REVIEW_COUNT);
        assertThat(responses).allSatisfy(response -> assertThat(response.venue()).isNotNull());

        // 목록 + count + 장소 배치 + 도시 배치 수준이면 충분하다.
        // 20건에 20+ 쿼리가 나오면 N+1 이 살아난 것이다.
        assertThat(queries)
                .as("리뷰 %d건에 쿼리 %d개 — N+1 이 살아났는지 확인할 것 "
                        + "(Venue/VenueCity 의 @BatchSize, ReviewRepository 의 fetch join)", REVIEW_COUNT, queries)
                .isLessThan(10);
    }

    @Test
    @DisplayName("태그된 장소가 삭제돼도 리뷰 목록은 살아 있고 태그만 사라진다")
    void deletedVenueDoesNotBreakReviewList() {
        Venue venue = persistVenue("없어질 바", VenueStatus.ACTIVE);
        persistReview(venue);
        entityManager.flush();

        // 소프트 삭제 — @SQLRestriction 때문에 이후 조회에서 이 행은 없는 것이 된다.
        venue.softDelete();
        entityManager.flush();
        entityManager.clear();

        Page<Review> page = reviewRepository.findBySpiritForDisplay(spirit.getId(), PageRequest.of(0, 10));

        assertThatCode(() -> {
            List<ReviewResponse> responses = page.getContent().stream().map(ReviewResponse::from).toList();
            assertThat(responses).hasSize(1);
            // 리뷰는 살아 있고 태그만 조용히 빠진다.
            assertThat(responses.get(0).venue()).isNull();
        }).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("비공개 장소를 태그한 리뷰는 태그를 노출하지 않는다")
    void hiddenVenueTagIsNotExposed() {
        persistReview(persistVenue("비공개 바", VenueStatus.HIDDEN));
        entityManager.flush();
        entityManager.clear();

        Page<Review> page = reviewRepository.findBySpiritForDisplay(spirit.getId(), PageRequest.of(0, 10));
        ReviewResponse response = ReviewResponse.from(page.getContent().get(0));

        assertThat(response.venue()).isNull();
    }

    @Test
    @DisplayName("태그가 없는 리뷰는 그대로 null 이다")
    void untaggedReviewHasNoVenue() {
        persistReview(null);
        entityManager.flush();
        entityManager.clear();

        Page<Review> page = reviewRepository.findBySpiritForDisplay(spirit.getId(), PageRequest.of(0, 10));

        assertThat(ReviewResponse.from(page.getContent().get(0)).venue()).isNull();
    }

    @Test
    @DisplayName("changeVenue 로 태그를 붙이고 뗄 수 있다 — 폼이 항상 보내는 규약과 짝이 맞는다")
    void changeVenueAttachesAndDetaches() {
        Review review = persistReview(null);
        Venue venue = persistVenue("나중에 붙일 바", VenueStatus.ACTIVE);

        review.changeVenue(venue);
        assertThat(review.getVenue()).isEqualTo(venue);

        // null 은 "변경 안 함"이 아니라 "태그 해제"다.
        review.changeVenue(null);
        assertThat(review.getVenue()).isNull();
    }
}
