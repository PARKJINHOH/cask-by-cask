package com.caskbycask.domain.bottlecollection.repository;

import com.caskbycask.domain.bottlecollection.dto.UserBottleResponse;
import com.caskbycask.domain.bottlecollection.dto.UserBottleSortKey;
import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class, UserBottleQueryRepository.class})
class UserBottleQueryRepositoryTest {

    @Autowired UserBottleQueryRepository queryRepository;
    @Autowired UserBottleRepository bottleRepository;
    @Autowired SpiritRepository spiritRepository;
    @Autowired UserRepository userRepository;
    @Autowired TestEntityManager entityManager;

    private Long ownerId;
    private Long alphaBottleId;
    private Long zuluBottleId;
    private Long parentId;

    @BeforeEach
    void setUp() {
        User owner = userRepository.save(User.builder()
            .email("bottle-owner@example.com").password("password")
            .nickname("owner").role(Role.MEMBER).build());
        User other = userRepository.save(User.builder()
            .email("bottle-other@example.com").password("password")
            .nickname("other").role(Role.MEMBER).build());
        ownerId = owner.getId();

        Spirit parent = spiritRepository.save(Spirit.builder()
            .nameKo("테스트 시리즈").nameEn("Test Series")
            .seriesIdentifier("배치").seriesIdentifierEn("Batch")
            .category(SpiritCategory.WHISKY).build());
        parentId = parent.getId();
        Spirit alpha = spiritRepository.save(Spirit.builder()
            .nameKo("나 주류").nameEn("Alpha Spirit")
            .category(SpiritCategory.WHISKY).parent(parent)
            .variantType(VariantType.BATCH)
            .seriesIdentifier("배치").seriesIdentifierEn("Batch")
            .variantValue("2").variantValueEn("Two").build());
        Spirit zulu = spiritRepository.save(Spirit.builder()
            .nameKo("가 주류").nameEn("Zulu Spirit")
            .category(SpiritCategory.WHISKY).build());

        zuluBottleId = bottleRepository.save(bottle(
            owner, zulu, LocalDate.of(2026, 1, 10), 300_000,
            BottleStatus.UNOPENED, false)).getId();
        alphaBottleId = bottleRepository.save(bottle(
            owner, alpha, LocalDate.of(2026, 5, 10), 100_000,
            BottleStatus.OPENED, true)).getId();
        bottleRepository.save(bottle(
            other, alpha, LocalDate.of(2026, 3, 10), 50_000,
            BottleStatus.OPENED, true));

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("사용자 범위를 강제하고 영문 이름 정렬을 전체 페이지에 적용한다")
    void findByUser_appliesOwnerAndGlobalLocalizedSort() {
        Page<UserBottle> first = find(UserBottleSortKey.NAME, Sort.Direction.ASC, "en", 0, 1);
        Page<UserBottle> second = find(UserBottleSortKey.NAME, Sort.Direction.ASC, "en", 1, 1);

        assertThat(first.getTotalElements()).isEqualTo(2);
        assertThat(first.getContent()).extracting(UserBottle::getId).containsExactly(alphaBottleId);
        assertThat(second.getContent()).extracting(UserBottle::getId).containsExactly(zuluBottleId);
    }

    @Test
    @DisplayName("카테고리·상태·구매일 범위를 DB 페이지 조회에 함께 적용한다")
    void findByUser_appliesFilters() {
        Page<UserBottle> result = queryRepository.findByUser(
            ownerId, SpiritCategory.WHISKY, BottleStatus.OPENED,
            LocalDate.of(2026, 2, 1), LocalDate.of(2026, 12, 31),
            UserBottleSortKey.PURCHASE_DATE, Sort.Direction.DESC, "ko",
            PageRequest.of(0, 20));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).extracting(UserBottle::getId).containsExactly(alphaBottleId);
    }

    @Test
    @DisplayName("허용된 모든 정렬 키를 처리하고 DTO용 에디션 관계를 일괄 로딩한다")
    void findByUser_supportsWhitelistAndFetchesDisplayRelations() {
        for (UserBottleSortKey sortKey : UserBottleSortKey.values()) {
            Page<UserBottle> result = find(sortKey, Sort.Direction.ASC, "ko", 0, 20);
            assertThat(result.getTotalElements()).as(sortKey.name()).isEqualTo(2);
        }

        UserBottle alphaBottle = find(UserBottleSortKey.NAME, Sort.Direction.ASC, "en", 0, 1)
            .getContent().getFirst();
        assertThat(Hibernate.isInitialized(alphaBottle.getSpirit())).isTrue();
        assertThat(Hibernate.isInitialized(alphaBottle.getSpirit().getParent())).isTrue();
        assertThat(Hibernate.isInitialized(alphaBottle.getImages())).isTrue();

        UserBottleResponse response = UserBottleResponse.from(alphaBottle);
        assertThat(response.parentId()).isEqualTo(parentId);
        assertThat(response.variantType()).isEqualTo(VariantType.BATCH);
        assertThat(response.seriesIdentifier()).isEqualTo("배치");
        assertThat(response.seriesIdentifierEn()).isEqualTo("Batch");
        assertThat(response.variantValue()).isEqualTo("2");
        assertThat(response.variantValueEn()).isEqualTo("Two");
    }

    @Test
    @DisplayName("이름 정렬은 동일 제품의 시리즈 식별자와 에디션 값까지 전역 순서에 반영한다")
    void findByUser_sortsEditionDisplayNameAcrossWholeResult() {
        User owner = userRepository.findById(ownerId).orElseThrow();
        Spirit parent = spiritRepository.findById(parentId).orElseThrow();
        Spirit firstEdition = spiritRepository.save(Spirit.builder()
            .nameKo("나 주류").nameEn("Alpha Spirit")
            .category(SpiritCategory.WHISKY).parent(parent)
            .variantType(VariantType.BATCH)
            .variantValue("1").variantValueEn("One").build());
        Long firstEditionBottleId = bottleRepository.save(bottle(
            owner, firstEdition, LocalDate.of(2026, 6, 1), 120_000,
            BottleStatus.UNOPENED, false)).getId();
        entityManager.flush();
        entityManager.clear();

        Page<UserBottle> result = find(UserBottleSortKey.NAME, Sort.Direction.ASC, "en", 0, 20);

        assertThat(result.getContent()).extracting(UserBottle::getId)
            .containsExactly(firstEditionBottleId, alphaBottleId, zuluBottleId);
        UserBottleResponse response = UserBottleResponse.from(result.getContent().getFirst());
        assertThat(response.seriesIdentifier()).isEqualTo("배치");
        assertThat(response.seriesIdentifierEn()).isEqualTo("Batch");
    }

    private Page<UserBottle> find(UserBottleSortKey sortKey, Sort.Direction direction,
                                  String lang, int page, int size) {
        return queryRepository.findByUser(
            ownerId, null, null, null, null,
            sortKey, direction, lang, PageRequest.of(page, size));
    }

    private UserBottle bottle(User user, Spirit spirit, LocalDate purchaseDate,
                              int price, BottleStatus status, boolean isPublic) {
        return UserBottle.builder()
            .user(user).spirit(spirit).category(SpiritCategory.WHISKY)
            .purchaseDate(purchaseDate).price(price).status(status)
            .isPublic(isPublic).build();
    }
}
