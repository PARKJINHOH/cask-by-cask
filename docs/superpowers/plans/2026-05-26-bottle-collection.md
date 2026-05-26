# 바틀 컬렉션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마이페이지에 "내 컬렉션" 탭을 추가해 위스키·꼬냑·와인 구매 바틀을 카테고리·이미지·공개 여부와 함께 관리하는 기능 구현

**Architecture:** 신규 `bottlecollection` 도메인을 백엔드·프론트엔드 모두 독립 구성. `UserBottle` + `UserBottleImage` 엔티티로 구매 기록 저장. Spirit DB 연결(nullable) + 자유 텍스트 혼합 지원. 프론트엔드는 MyPage 7번째 탭, PC 테이블/카드 전환, 모바일 카드 고정.

**Tech Stack:** Java 21 / Spring Boot / JPA + QueryDSL / React + TypeScript / React Query / Tailwind CSS / react-i18next

**Spec:** `docs/superpowers/specs/2026-05-26-bottle-collection-design.md`

---

## 파일 구조

**백엔드 생성:**
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/BottleStatus.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/UserBottle.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/UserBottleImage.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/repository/UserBottleRepository.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/repository/UserBottleImageRepository.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/repository/UserBottleQueryRepository.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/dto/BottleStatsDto.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/dto/UserBottleRequest.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/dto/UserBottleResponse.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/dto/UserBottleListResponse.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/service/UserBottleService.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/service/UserBottleImageService.java`
- `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/controller/UserBottleController.java`
- `drinkindex-api/src/test/java/com/drinkindex/domain/bottlecollection/service/UserBottleServiceTest.java`

**백엔드 수정:**
- `drinkindex-api/src/main/java/com/drinkindex/global/exception/ErrorCode.java`

**프론트엔드 생성:**
- `drinkindex-web/src/domain/user-bottle/types/userBottle.types.ts`
- `drinkindex-web/src/domain/user-bottle/api/userBottleApi.ts`
- `drinkindex-web/src/domain/user-bottle/hooks/useUserBottle.ts`
- `drinkindex-web/src/domain/user-bottle/components/BottleStats.tsx`
- `drinkindex-web/src/domain/user-bottle/components/BottleFilterBar.tsx`
- `drinkindex-web/src/domain/user-bottle/components/BottleTable.tsx`
- `drinkindex-web/src/domain/user-bottle/components/BottleCard.tsx`
- `drinkindex-web/src/domain/user-bottle/components/BottleList.tsx`
- `drinkindex-web/src/domain/user-bottle/components/BottleFormModal.tsx`
- `drinkindex-web/src/domain/user-bottle/components/BottleCollectionTab.tsx`
- `drinkindex-web/src/pages/UserBottlePublicPage.tsx`

**프론트엔드 수정:**
- `drinkindex-web/src/pages/MyPage.tsx`
- `drinkindex-web/src/App.tsx`
- `drinkindex-web/src/locales/ko.json`
- `drinkindex-web/src/locales/en.json`
- `drinkindex-web/vite.config.ts`

---

## Task 1: 엔티티 + ErrorCode

**Files:**
- Create: `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/BottleStatus.java`
- Create: `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/UserBottle.java`
- Create: `drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/UserBottleImage.java`
- Modify: `drinkindex-api/src/main/java/com/drinkindex/global/exception/ErrorCode.java`

- [ ] **Step 1: BottleStatus enum 생성**

```java
// drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/BottleStatus.java
package com.drinkindex.domain.bottlecollection.entity;

public enum BottleStatus {
    OPENED, UNOPENED
}
```

- [ ] **Step 2: UserBottleImage 엔티티 생성**

```java
// drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/UserBottleImage.java
package com.drinkindex.domain.bottlecollection.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_bottle_image")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserBottleImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_bottle_id", nullable = false)
    private UserBottle userBottle;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
```

- [ ] **Step 3: UserBottle 엔티티 생성**

```java
// drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/entity/UserBottle.java
package com.drinkindex.domain.bottlecollection.entity;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "user_bottle",
    indexes = {
        @Index(name = "idx_user_bottle_user_id", columnList = "user_id"),
        @Index(name = "idx_user_bottle_user_category", columnList = "user_id, category"),
        @Index(name = "idx_user_bottle_user_public", columnList = "user_id, is_public")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserBottle extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    @Column(name = "spirit_name_text", length = 200)
    private String spiritNameText;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private SpiritCategory category;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Column(name = "batch", length = 100)
    private String batch;

    @Column(name = "bottling_year", length = 100)
    private String bottlingYear;

    @Column(name = "price", nullable = false)
    private Integer price;

    @Column(name = "store", nullable = false, length = 200)
    private String store;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BottleStatus status;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic;

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    @OneToMany(mappedBy = "userBottle", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<UserBottleImage> images = new ArrayList<>();

    public void update(Spirit spirit, String spiritNameText, SpiritCategory category,
                       LocalDate purchaseDate, String batch, String bottlingYear,
                       Integer price, String store, BottleStatus status,
                       boolean isPublic, String memo) {
        this.spirit = spirit;
        this.spiritNameText = spiritNameText;
        this.category = category;
        this.purchaseDate = purchaseDate;
        this.batch = batch;
        this.bottlingYear = bottlingYear;
        this.price = price;
        this.store = store;
        this.status = status;
        this.isPublic = isPublic;
        this.memo = memo;
    }

    public void toggleStatus() {
        this.status = (this.status == BottleStatus.OPENED) ? BottleStatus.UNOPENED : BottleStatus.OPENED;
    }

    public void togglePublic() {
        this.isPublic = !this.isPublic;
    }

    public boolean isOwnedBy(Long userId) {
        return this.user.getId().equals(userId);
    }
}
```

- [ ] **Step 4: ErrorCode에 BOTTLE_* 항목 추가**

`ErrorCode.java`에서 `// Wishlist` 섹션 바로 아래에 추가:

```java
    // Bottle Collection
    BOTTLE_NOT_FOUND(HttpStatus.NOT_FOUND, "BOTTLE_001", "바틀을 찾을 수 없습니다."),
    BOTTLE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "BOTTLE_002", "본인의 바틀만 수정/삭제할 수 있습니다."),
    BOTTLE_IMAGE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "BOTTLE_003", "이미지는 최대 2장까지 등록할 수 있습니다."),
```

- [ ] **Step 5: 빌드 확인**

```bash
cd drinkindex-api && ./gradlew build -x test
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 커밋**

```bash
git add drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/ \
        drinkindex-api/src/main/java/com/drinkindex/global/exception/ErrorCode.java
git commit -m "feat(bottle): UserBottle, UserBottleImage 엔티티 및 ErrorCode 추가"
```

---

## Task 2: Repository + DTO

**Files:**
- Create: `...bottlecollection/repository/UserBottleRepository.java`
- Create: `...bottlecollection/repository/UserBottleImageRepository.java`
- Create: `...bottlecollection/repository/UserBottleQueryRepository.java`
- Create: `...bottlecollection/dto/BottleStatsDto.java`
- Create: `...bottlecollection/dto/UserBottleRequest.java`
- Create: `...bottlecollection/dto/UserBottleResponse.java`
- Create: `...bottlecollection/dto/UserBottleListResponse.java`

- [ ] **Step 1: UserBottleRepository**

```java
package com.drinkindex.domain.bottlecollection.repository;

import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserBottleRepository extends JpaRepository<UserBottle, Long> {
}
```

- [ ] **Step 2: UserBottleImageRepository**

```java
package com.drinkindex.domain.bottlecollection.repository;

import com.drinkindex.domain.bottlecollection.entity.UserBottleImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserBottleImageRepository extends JpaRepository<UserBottleImage, Long> {
    Optional<UserBottleImage> findByIdAndUserBottleId(Long id, Long bottleId);
    int countByUserBottleId(Long bottleId);
}
```

- [ ] **Step 3: BottleStatsDto (QueryDSL projection용)**

```java
package com.drinkindex.domain.bottlecollection.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;

import java.util.List;

public record BottleStatsDto(
    long totalCount,
    long totalPrice,
    long openedCount,
    long unopenedCount,
    List<CategoryStat> categoryStats
) {
    public record CategoryStat(SpiritCategory category, long count) {}
}
```

- [ ] **Step 4: UserBottleQueryRepository (QueryDSL)**

```java
package com.drinkindex.domain.bottlecollection.repository;

import com.drinkindex.domain.bottlecollection.dto.BottleStatsDto;
import com.drinkindex.domain.bottlecollection.entity.BottleStatus;
import com.drinkindex.domain.bottlecollection.entity.QUserBottle;
import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class UserBottleQueryRepository {

    private final JPAQueryFactory queryFactory;
    private static final QUserBottle bottle = QUserBottle.userBottle;

    public Page<UserBottle> findByUser(Long userId, SpiritCategory category,
                                       BottleStatus status, Pageable pageable) {
        BooleanBuilder where = buildWhere(userId, category, status, null);

        List<UserBottle> content = queryFactory
            .selectFrom(bottle)
            .leftJoin(bottle.spirit).fetchJoin()
            .where(where)
            .orderBy(bottle.purchaseDate.desc(), bottle.id.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        return PageableExecutionUtils.getPage(content, pageable,
            () -> queryFactory.select(bottle.count()).from(bottle).where(where).fetchOne());
    }

    public Page<UserBottle> findPublicByUser(Long userId, SpiritCategory category, Pageable pageable) {
        BooleanBuilder where = buildWhere(userId, category, null, true);

        List<UserBottle> content = queryFactory
            .selectFrom(bottle)
            .leftJoin(bottle.spirit).fetchJoin()
            .where(where)
            .orderBy(bottle.purchaseDate.desc(), bottle.id.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        return PageableExecutionUtils.getPage(content, pageable,
            () -> queryFactory.select(bottle.count()).from(bottle).where(where).fetchOne());
    }

    public BottleStatsDto getStats(Long userId) {
        var totals = queryFactory
            .select(bottle.count(), bottle.price.sum().coalesce(0))
            .from(bottle)
            .where(bottle.user.id.eq(userId))
            .fetchOne();

        long totalCount = totals.get(bottle.count());
        long totalPrice = totals.get(bottle.price.sum().coalesce(0)).longValue();

        long openedCount = queryFactory.select(bottle.count()).from(bottle)
            .where(bottle.user.id.eq(userId), bottle.status.eq(BottleStatus.OPENED))
            .fetchOne();

        List<BottleStatsDto.CategoryStat> categoryStats = queryFactory
            .select(Projections.constructor(BottleStatsDto.CategoryStat.class,
                bottle.category, bottle.count()))
            .from(bottle)
            .where(bottle.user.id.eq(userId))
            .groupBy(bottle.category)
            .fetch();

        return new BottleStatsDto(totalCount, totalPrice, openedCount,
            totalCount - openedCount, categoryStats);
    }

    private BooleanBuilder buildWhere(Long userId, SpiritCategory category,
                                      BottleStatus status, Boolean isPublic) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(bottle.user.id.eq(userId));
        if (category != null) where.and(bottle.category.eq(category));
        if (status != null) where.and(bottle.status.eq(status));
        if (Boolean.TRUE.equals(isPublic)) where.and(bottle.isPublic.isTrue());
        return where;
    }
}
```

- [ ] **Step 5: UserBottleRequest record**

```java
package com.drinkindex.domain.bottlecollection.dto;

import com.drinkindex.domain.bottlecollection.entity.BottleStatus;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UserBottleRequest(
    Long spiritId,
    String spiritNameText,
    @NotNull SpiritCategory category,
    @NotNull LocalDate purchaseDate,
    String batch,
    String bottlingYear,
    @NotNull @Min(0) Integer price,
    @NotBlank String store,
    @NotNull BottleStatus status,
    boolean isPublic,
    String memo
) {}
```

- [ ] **Step 6: UserBottleResponse record**

```java
package com.drinkindex.domain.bottlecollection.dto;

import com.drinkindex.domain.bottlecollection.entity.BottleStatus;
import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record UserBottleResponse(
    Long id,
    Long spiritId,
    String spiritNameKo,
    String spiritNameEn,
    String spiritNameText,
    SpiritCategory category,
    LocalDate purchaseDate,
    String batch,
    String bottlingYear,
    Integer price,
    String store,
    BottleStatus status,
    boolean isPublic,
    String memo,
    List<String> imageUrls,
    LocalDateTime createdAt
) {
    public static UserBottleResponse from(UserBottle b) {
        String nameKo = b.getSpirit() != null ? b.getSpirit().getNameKo() : null;
        String nameEn = b.getSpirit() != null ? b.getSpirit().getNameEn() : null;
        List<String> urls = b.getImages().stream()
            .map(img -> img.getImageUrl())
            .toList();
        return new UserBottleResponse(
            b.getId(),
            b.getSpirit() != null ? b.getSpirit().getId() : null,
            nameKo, nameEn, b.getSpiritNameText(),
            b.getCategory(), b.getPurchaseDate(), b.getBatch(), b.getBottlingYear(),
            b.getPrice(), b.getStore(), b.getStatus(), b.isPublic(),
            b.getMemo(), urls, b.getCreatedAt()
        );
    }
}
```

- [ ] **Step 7: UserBottleListResponse record**

```java
package com.drinkindex.domain.bottlecollection.dto;

import java.util.List;

public record UserBottleListResponse(
    List<UserBottleResponse> bottles,
    BottleStatsDto stats,
    int totalPages,
    long totalElements,
    int currentPage
) {}
```

- [ ] **Step 8: 빌드 확인**

```bash
cd drinkindex-api && ./gradlew build -x test
```
Expected: `BUILD SUCCESSFUL` (QueryDSL Q클래스 자동 생성)

- [ ] **Step 9: 커밋**

```bash
git add drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/
git commit -m "feat(bottle): Repository, QueryDSL, DTO 추가"
```

---

## Task 3: Service + 단위 테스트

**Files:**
- Create: `...bottlecollection/service/UserBottleService.java`
- Create: `drinkindex-api/src/test/java/com/drinkindex/domain/bottlecollection/service/UserBottleServiceTest.java`

- [ ] **Step 1: 실패 테스트 작성**

```java
// drinkindex-api/src/test/java/com/drinkindex/domain/bottlecollection/service/UserBottleServiceTest.java
package com.drinkindex.domain.bottlecollection.service;

import com.drinkindex.domain.bottlecollection.dto.UserBottleRequest;
import com.drinkindex.domain.bottlecollection.dto.UserBottleResponse;
import com.drinkindex.domain.bottlecollection.entity.BottleStatus;
import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import com.drinkindex.domain.bottlecollection.repository.UserBottleQueryRepository;
import com.drinkindex.domain.bottlecollection.repository.UserBottleRepository;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class UserBottleServiceTest {

    @Mock UserBottleRepository userBottleRepository;
    @Mock UserBottleQueryRepository userBottleQueryRepository;
    @Mock UserRepository userRepository;
    @Mock SpiritRepository spiritRepository;
    @InjectMocks UserBottleService userBottleService;

    @Test
    @DisplayName("바틀 등록 - 자유 텍스트 이름으로 등록 성공")
    void createBottle_freeText_success() {
        User user = mock(User.class);
        given(userRepository.findById(1L)).willReturn(Optional.of(user));

        UserBottleRequest req = new UserBottleRequest(
            null, "글렌드로낙 18년", SpiritCategory.WHISKY,
            LocalDate.of(2025, 12, 5), null, null,
            220000, "대만-가품양주", BottleStatus.OPENED, true, null
        );

        UserBottle saved = UserBottle.builder()
            .user(user).spiritNameText("글렌드로낙 18년")
            .category(SpiritCategory.WHISKY).purchaseDate(LocalDate.of(2025, 12, 5))
            .price(220000).store("대만-가품양주").status(BottleStatus.OPENED)
            .isPublic(true).build();
        ReflectionTestUtils.setField(saved, "id", 1L);
        given(userBottleRepository.save(any())).willReturn(saved);

        UserBottleResponse resp = userBottleService.createBottle(1L, req);

        assertThat(resp.spiritNameText()).isEqualTo("글렌드로낙 18년");
        assertThat(resp.isPublic()).isTrue();
        then(userBottleRepository).should().save(any(UserBottle.class));
    }

    @Test
    @DisplayName("타인 바틀 삭제 시 BOTTLE_ACCESS_DENIED 예외")
    void deleteBottle_notOwner_throws() {
        User owner = mock(User.class);
        given(owner.getId()).willReturn(99L);

        UserBottle bottle = UserBottle.builder()
            .user(owner).category(SpiritCategory.WHISKY)
            .purchaseDate(LocalDate.now()).price(0).store("test")
            .status(BottleStatus.UNOPENED).isPublic(false).build();
        ReflectionTestUtils.setField(bottle, "id", 1L);
        given(userBottleRepository.findById(1L)).willReturn(Optional.of(bottle));

        assertThatThrownBy(() -> userBottleService.deleteBottle(1L, 1L))
            .isInstanceOf(CustomException.class)
            .extracting("errorCode").isEqualTo(ErrorCode.BOTTLE_ACCESS_DENIED);
    }

    @Test
    @DisplayName("toggleStatus - UNOPENED → OPENED")
    void toggleStatus_success() {
        User user = mock(User.class);
        given(user.getId()).willReturn(1L);

        UserBottle bottle = UserBottle.builder()
            .user(user).category(SpiritCategory.WHISKY)
            .purchaseDate(LocalDate.now()).price(0).store("test")
            .status(BottleStatus.UNOPENED).isPublic(false).build();
        ReflectionTestUtils.setField(bottle, "id", 1L);
        given(userBottleRepository.findById(1L)).willReturn(Optional.of(bottle));

        userBottleService.toggleStatus(1L, 1L);

        assertThat(bottle.getStatus()).isEqualTo(BottleStatus.OPENED);
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd drinkindex-api && ./gradlew test --tests "com.drinkindex.domain.bottlecollection.service.UserBottleServiceTest"
```
Expected: FAILED (UserBottleService 없음)

- [ ] **Step 3: UserBottleService 구현**

```java
package com.drinkindex.domain.bottlecollection.service;

import com.drinkindex.domain.bottlecollection.dto.*;
import com.drinkindex.domain.bottlecollection.entity.BottleStatus;
import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import com.drinkindex.domain.bottlecollection.repository.UserBottleQueryRepository;
import com.drinkindex.domain.bottlecollection.repository.UserBottleRepository;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserBottleService {

    private final UserBottleRepository userBottleRepository;
    private final UserBottleQueryRepository userBottleQueryRepository;
    private final UserRepository userRepository;
    private final SpiritRepository spiritRepository;

    @Transactional
    public UserBottleResponse createBottle(Long userId, UserBottleRequest req) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        Spirit spirit = resolveSpirit(req.spiritId());

        UserBottle bottle = UserBottle.builder()
            .user(user).spirit(spirit).spiritNameText(req.spiritNameText())
            .category(req.category()).purchaseDate(req.purchaseDate())
            .batch(req.batch()).bottlingYear(req.bottlingYear())
            .price(req.price()).store(req.store())
            .status(req.status()).isPublic(req.isPublic()).memo(req.memo())
            .build();

        return UserBottleResponse.from(userBottleRepository.save(bottle));
    }

    public UserBottleListResponse getMyBottles(Long userId, SpiritCategory category,
                                                BottleStatus status, Pageable pageable) {
        Page<UserBottle> page = userBottleQueryRepository.findByUser(userId, category, status, pageable);
        BottleStatsDto stats = userBottleQueryRepository.getStats(userId);
        return toListResponse(page, stats, pageable.getPageNumber());
    }

    public UserBottleListResponse getPublicBottles(Long userId, SpiritCategory category, Pageable pageable) {
        Page<UserBottle> page = userBottleQueryRepository.findPublicByUser(userId, category, pageable);
        long total = page.getTotalElements();
        // 공개 페이지에서는 총금액 집계 비공개 (타인에게 전체 지출 노출 방지)
        BottleStatsDto stats = new BottleStatsDto(total, 0L, 0L, 0L, List.of());
        return toListResponse(page, stats, pageable.getPageNumber());
    }

    public UserBottleResponse getBottle(Long bottleId, Long userId) {
        return UserBottleResponse.from(findAndValidateOwner(bottleId, userId));
    }

    @Transactional
    public UserBottleResponse updateBottle(Long bottleId, Long userId, UserBottleRequest req) {
        UserBottle bottle = findAndValidateOwner(bottleId, userId);
        Spirit spirit = resolveSpirit(req.spiritId());
        bottle.update(spirit, req.spiritNameText(), req.category(),
            req.purchaseDate(), req.batch(), req.bottlingYear(),
            req.price(), req.store(), req.status(), req.isPublic(), req.memo());
        return UserBottleResponse.from(bottle);
    }

    @Transactional
    public void deleteBottle(Long bottleId, Long userId) {
        userBottleRepository.delete(findAndValidateOwner(bottleId, userId));
    }

    @Transactional
    public UserBottleResponse toggleStatus(Long bottleId, Long userId) {
        UserBottle bottle = findAndValidateOwner(bottleId, userId);
        bottle.toggleStatus();
        return UserBottleResponse.from(bottle);
    }

    @Transactional
    public UserBottleResponse togglePublic(Long bottleId, Long userId) {
        UserBottle bottle = findAndValidateOwner(bottleId, userId);
        bottle.togglePublic();
        return UserBottleResponse.from(bottle);
    }

    public UserBottle findAndValidateOwner(Long bottleId, Long userId) {
        UserBottle bottle = userBottleRepository.findById(bottleId)
            .orElseThrow(() -> new CustomException(ErrorCode.BOTTLE_NOT_FOUND));
        if (!bottle.isOwnedBy(userId)) throw new CustomException(ErrorCode.BOTTLE_ACCESS_DENIED);
        return bottle;
    }

    private Spirit resolveSpirit(Long spiritId) {
        if (spiritId == null) return null;
        return spiritRepository.findById(spiritId)
            .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
    }

    private UserBottleListResponse toListResponse(Page<UserBottle> page, BottleStatsDto stats, int pageNum) {
        List<UserBottleResponse> bottles = page.getContent().stream()
            .map(UserBottleResponse::from).toList();
        return new UserBottleListResponse(bottles, stats,
            page.getTotalPages(), page.getTotalElements(), pageNum);
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd drinkindex-api && ./gradlew test --tests "com.drinkindex.domain.bottlecollection.service.UserBottleServiceTest"
```
Expected: 3 tests PASSED

- [ ] **Step 5: 커밋**

```bash
git add drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/service/UserBottleService.java \
        drinkindex-api/src/test/java/com/drinkindex/domain/bottlecollection/service/UserBottleServiceTest.java
git commit -m "feat(bottle): UserBottleService 구현 + 단위 테스트"
```

---

## Task 4: 이미지 서비스 + Controller + vite proxy

**Files:**
- Create: `...bottlecollection/service/UserBottleImageService.java`
- Create: `...bottlecollection/controller/UserBottleController.java`
- Modify: `drinkindex-web/vite.config.ts`

- [ ] **Step 1: UserBottleImageService 구현**

저장 경로: `${upload.path}/bottles/{bottleId}/{uuid}.{ext}` — `SpiritImageService`와 동일한 로컬 파일시스템 + WebP 변환 패턴.

```java
package com.drinkindex.domain.bottlecollection.service;

import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import com.drinkindex.domain.bottlecollection.entity.UserBottleImage;
import com.drinkindex.domain.bottlecollection.repository.UserBottleImageRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.WebpConversionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserBottleImageService {

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png");
    private static final Set<String> ALLOWED_EXTS = Set.of("jpg", "jpeg", "png");
    private static final long MAX_SIZE = 10L * 1024 * 1024;

    @Value("${upload.path}")
    private String uploadPath;

    private final UserBottleService userBottleService;
    private final UserBottleImageRepository userBottleImageRepository;
    private final WebpConversionService webpConversionService;

    @Transactional
    public void uploadImage(Long bottleId, Long userId, MultipartFile file) {
        UserBottle bottle = userBottleService.findAndValidateOwner(bottleId, userId);

        if (userBottleImageRepository.countByUserBottleId(bottleId) >= 2) {
            throw new CustomException(ErrorCode.BOTTLE_IMAGE_LIMIT_EXCEEDED);
        }
        validateFile(file);

        String ext = getExt(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "." + ext;
        String relativeUrl = saveFile(bottleId, filename, file);
        int sortOrder = userBottleImageRepository.countByUserBottleId(bottleId);

        userBottleImageRepository.save(UserBottleImage.builder()
            .userBottle(bottle).imageUrl(relativeUrl).sortOrder(sortOrder).build());
    }

    @Transactional
    public void deleteImage(Long bottleId, Long imageId, Long userId) {
        userBottleService.findAndValidateOwner(bottleId, userId);
        UserBottleImage image = userBottleImageRepository.findByIdAndUserBottleId(imageId, bottleId)
            .orElseThrow(() -> new CustomException(ErrorCode.BOTTLE_NOT_FOUND));
        userBottleImageRepository.delete(image);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        if (file.getSize() > MAX_SIZE) throw new CustomException(ErrorCode.IMAGE_SIZE_EXCEEDED);
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_TYPES.contains(ct.toLowerCase()))
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        if (!ALLOWED_EXTS.contains(getExt(file.getOriginalFilename()).toLowerCase()))
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
    }

    private String saveFile(Long bottleId, String filename, MultipartFile file) {
        try {
            Path dir = Paths.get(uploadPath, "bottles", bottleId.toString());
            Files.createDirectories(dir);
            try {
                byte[] webp = webpConversionService.convertToWebp(file.getBytes());
                String webpName = filename.replaceAll("\\.[^.]+$", ".webp");
                Files.write(dir.resolve(webpName), webp);
                return "/uploads/bottles/" + bottleId + "/" + webpName;
            } catch (Exception e) {
                log.warn("WebP 변환 실패, 원본 저장: {}", e.getMessage());
                Files.write(dir.resolve(filename), file.getBytes());
                return "/uploads/bottles/" + bottleId + "/" + filename;
            }
        } catch (IOException e) {
            throw new RuntimeException("이미지 저장 실패", e);
        }
    }

    private String getExt(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1);
    }
}
```

- [ ] **Step 2: UserBottleController 구현**

```java
package com.drinkindex.domain.bottlecollection.controller;

import com.drinkindex.domain.bottlecollection.dto.*;
import com.drinkindex.domain.bottlecollection.entity.BottleStatus;
import com.drinkindex.domain.bottlecollection.service.UserBottleImageService;
import com.drinkindex.domain.bottlecollection.service.UserBottleService;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class UserBottleController {

    private final UserBottleService userBottleService;
    private final UserBottleImageService userBottleImageService;

    @GetMapping("/api/bottles/my")
    public ResponseEntity<ApiResponse<UserBottleListResponse>> getMyBottles(
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) BottleStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getMyBottles(userDetails.getUserId(), category, status,
                PageRequest.of(page, size))));
    }

    @PostMapping("/api/bottles")
    public ResponseEntity<ApiResponse<UserBottleResponse>> createBottle(
            @Valid @RequestBody UserBottleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.createBottle(userDetails.getUserId(), request)));
    }

    @GetMapping("/api/bottles/{id}")
    public ResponseEntity<ApiResponse<UserBottleResponse>> getBottle(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getBottle(id, userDetails.getUserId())));
    }

    @PutMapping("/api/bottles/{id}")
    public ResponseEntity<ApiResponse<UserBottleResponse>> updateBottle(
            @PathVariable Long id,
            @Valid @RequestBody UserBottleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.updateBottle(id, userDetails.getUserId(), request)));
    }

    @DeleteMapping("/api/bottles/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBottle(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userBottleService.deleteBottle(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/api/bottles/{id}/status")
    public ResponseEntity<ApiResponse<UserBottleResponse>> toggleStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.toggleStatus(id, userDetails.getUserId())));
    }

    @PatchMapping("/api/bottles/{id}/public")
    public ResponseEntity<ApiResponse<UserBottleResponse>> togglePublic(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.togglePublic(id, userDetails.getUserId())));
    }

    @PostMapping("/api/bottles/{id}/images")
    public ResponseEntity<ApiResponse<Void>> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userBottleImageService.uploadImage(id, userDetails.getUserId(), file);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/api/bottles/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @PathVariable Long id,
            @PathVariable Long imageId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userBottleImageService.deleteImage(id, imageId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 인증 불필요 — Spring Security permitAll 설정 필요
    @GetMapping("/api/users/{userId}/bottles")
    public ResponseEntity<ApiResponse<UserBottleListResponse>> getPublicBottles(
            @PathVariable Long userId,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getPublicBottles(userId, category, PageRequest.of(page, size))));
    }
}
```

- [ ] **Step 3: Spring Security에서 공개 API 허용**

백엔드 Security 설정 파일(보통 `SecurityConfig.java`)에서 `/api/users/*/bottles` 경로를 `permitAll()` 목록에 추가. 기존 패턴을 따라 추가:

```java
.requestMatchers(HttpMethod.GET, "/api/users/*/bottles").permitAll()
```

- [ ] **Step 4: vite.config.ts proxy 추가**

`/api/ranking` 항목 바로 아래에 추가:

```typescript
      '/api/bottles': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
```

- [ ] **Step 5: 전체 빌드 확인**

```bash
cd drinkindex-api && ./gradlew build -x test
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 커밋**

```bash
git add drinkindex-api/src/main/java/com/drinkindex/domain/bottlecollection/ \
        drinkindex-web/vite.config.ts
git commit -m "feat(bottle): 이미지 서비스, Controller, vite proxy 추가"
```

---

## Task 5: 프론트엔드 타입 + API + i18n

**Files:**
- Create: `drinkindex-web/src/domain/user-bottle/types/userBottle.types.ts`
- Create: `drinkindex-web/src/domain/user-bottle/api/userBottleApi.ts`
- Create: `drinkindex-web/src/domain/user-bottle/hooks/useUserBottle.ts`
- Modify: `drinkindex-web/src/locales/ko.json`
- Modify: `drinkindex-web/src/locales/en.json`

- [ ] **Step 1: TypeScript 타입 파일**

`SpiritCategory`는 백엔드 enum(`WHISKY, COGNAC, WINE, OTHER`) 값과 일치해야 함.

```typescript
// drinkindex-web/src/domain/user-bottle/types/userBottle.types.ts
export type BottleStatus = 'OPENED' | 'UNOPENED';
export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER';

export interface UserBottle {
  id: number;
  spiritId: number | null;
  spiritNameKo: string | null;
  spiritNameEn: string | null;
  spiritNameText: string | null;
  category: SpiritCategory;
  purchaseDate: string;
  batch: string | null;
  bottlingYear: string | null;
  price: number;
  store: string;
  status: BottleStatus;
  isPublic: boolean;
  memo: string | null;
  imageUrls: string[];
  createdAt: string;
}

export interface CategoryStat { category: SpiritCategory; count: number; }

export interface BottleStats {
  totalCount: number;
  totalPrice: number;
  openedCount: number;
  unopenedCount: number;
  categoryStats: CategoryStat[];
}

export interface BottleListResponse {
  bottles: UserBottle[];
  stats: BottleStats;
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

export interface UserBottleRequest {
  spiritId?: number;
  spiritNameText?: string;
  category: SpiritCategory;
  purchaseDate: string;
  batch?: string;
  bottlingYear?: string;
  price: number;
  store: string;
  status: BottleStatus;
  isPublic: boolean;
  memo?: string;
}
```

- [ ] **Step 2: API 함수**

```typescript
// drinkindex-web/src/domain/user-bottle/api/userBottleApi.ts
import axiosInstance from '@/shared/api/axiosInstance';
import type { ApiResponse } from '@/shared/types/common.types';
import type { BottleListResponse, UserBottle, UserBottleRequest, SpiritCategory, BottleStatus } from '../types/userBottle.types';

export const userBottleApi = {
  getMyBottles: (params: { category?: SpiritCategory; status?: BottleStatus; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<BottleListResponse>>('/api/bottles/my', { params })
      .then(r => r.data.data),

  createBottle: (data: UserBottleRequest) =>
    axiosInstance.post<ApiResponse<UserBottle>>('/api/bottles', data)
      .then(r => r.data.data),

  updateBottle: (id: number, data: UserBottleRequest) =>
    axiosInstance.put<ApiResponse<UserBottle>>(`/api/bottles/${id}`, data)
      .then(r => r.data.data),

  deleteBottle: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/bottles/${id}`),

  toggleStatus: (id: number) =>
    axiosInstance.patch<ApiResponse<UserBottle>>(`/api/bottles/${id}/status`)
      .then(r => r.data.data),

  togglePublic: (id: number) =>
    axiosInstance.patch<ApiResponse<UserBottle>>(`/api/bottles/${id}/public`)
      .then(r => r.data.data),

  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosInstance.post<ApiResponse<void>>(`/api/bottles/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (bottleId: number, imageId: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/bottles/${bottleId}/images/${imageId}`),

  getPublicBottles: (userId: number, params?: { category?: SpiritCategory; page?: number }) =>
    axiosInstance.get<ApiResponse<BottleListResponse>>(`/api/users/${userId}/bottles`, { params })
      .then(r => r.data.data),
};
```

- [ ] **Step 3: React Query hooks**

```typescript
// drinkindex-web/src/domain/user-bottle/hooks/useUserBottle.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/domain/auth/store/authStore';
import { userBottleApi } from '../api/userBottleApi';
import type { SpiritCategory, BottleStatus, UserBottleRequest } from '../types/userBottle.types';

const MY_BOTTLES_KEY = ['bottles', 'my'] as const;

export function useMyBottles(params: { category?: SpiritCategory; status?: BottleStatus; page?: number }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  return useQuery({
    queryKey: [...MY_BOTTLES_KEY, params],
    queryFn: () => userBottleApi.getMyBottles(params),
    enabled: isLoggedIn,
  });
}

export function usePublicBottles(userId: number, category?: SpiritCategory) {
  return useQuery({
    queryKey: ['bottles', 'public', userId, category],
    queryFn: () => userBottleApi.getPublicBottles(userId, { category }),
  });
}

function useInvalidateMyBottles() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: MY_BOTTLES_KEY });
}

export function useCreateBottle() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (data: UserBottleRequest) => userBottleApi.createBottle(data), onSuccess: invalidate });
}

export function useUpdateBottle() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserBottleRequest }) => userBottleApi.updateBottle(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteBottle() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (id: number) => userBottleApi.deleteBottle(id), onSuccess: invalidate });
}

export function useToggleBottleStatus() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (id: number) => userBottleApi.toggleStatus(id), onSuccess: invalidate });
}

export function useToggleBottlePublic() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (id: number) => userBottleApi.togglePublic(id), onSuccess: invalidate });
}

export function useUploadBottleImage() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => userBottleApi.uploadImage(id, file),
    onSuccess: invalidate,
  });
}

export function useDeleteBottleImage() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({
    mutationFn: ({ bottleId, imageId }: { bottleId: number; imageId: number }) =>
      userBottleApi.deleteImage(bottleId, imageId),
    onSuccess: invalidate,
  });
}
```

- [ ] **Step 4: ko.json 번역 키 추가**

`ko.json` 최상위 객체에 추가 (기존 키 뒤):

```json
"mypage.collectionTab": "내 컬렉션",
"collection.stats.totalBottles": "총 {{count}}병",
"collection.stats.totalPrice": "₩{{price}}",
"collection.stats.opened": "오픈 {{count}}",
"collection.stats.unopened": "미오픈 {{count}}",
"collection.filter.all": "전체",
"collection.filter.WHISKY": "위스키",
"collection.filter.COGNAC": "꼬냑",
"collection.filter.WINE": "와인",
"collection.filter.OTHER": "기타",
"collection.status.OPENED": "오픈",
"collection.status.UNOPENED": "미오픈",
"collection.visibility.public": "공개",
"collection.visibility.private": "비공개",
"collection.view.table": "테이블",
"collection.view.card": "카드",
"collection.addBottle": "+ 추가",
"collection.editBottle": "수정",
"collection.deleteBottle": "삭제",
"collection.deleteConfirm": "\"{{name}}\"을(를) 삭제하시겠습니까?",
"collection.empty": "아직 등록된 바틀이 없습니다.",
"collection.emptyDesc": "바틀 추가 버튼으로 구매 기록을 남겨보세요!",
"collection.form.title.add": "바틀 추가",
"collection.form.title.edit": "바틀 수정",
"collection.form.spiritSearch": "술 검색 (DB에 없으면 직접 입력)",
"collection.form.spiritName": "품명",
"collection.form.category": "종류",
"collection.form.purchaseDate": "구매일",
"collection.form.price": "금액",
"collection.form.store": "구입 매장",
"collection.form.batch": "배치 (선택)",
"collection.form.bottlingYear": "병입년도 (선택)",
"collection.form.status": "상태",
"collection.form.isPublic": "공개 여부",
"collection.form.isPublicDesc": "공개 시 내 프로필 URL로 공유 가능",
"collection.form.images": "이미지 (최대 2장)",
"collection.form.memo": "메모 (선택)",
"collection.form.save": "저장",
"collection.form.cancel": "취소",
"collection.table.category": "종류",
"collection.table.purchaseDate": "구매일",
"collection.table.name": "품명",
"collection.table.batch": "배치",
"collection.table.bottlingYear": "병입년도",
"collection.table.price": "금액",
"collection.table.store": "매장",
"collection.table.status": "상태",
"collection.table.visibility": "공개",
"collection.table.actions": "편집",
"collection.publicPage.title": "{{nickname}}의 컬렉션"
```

- [ ] **Step 5: en.json 동일 키 추가**

```json
"mypage.collectionTab": "My Collection",
"collection.stats.totalBottles": "{{count}} bottles",
"collection.stats.totalPrice": "₩{{price}}",
"collection.stats.opened": "Opened: {{count}}",
"collection.stats.unopened": "Sealed: {{count}}",
"collection.filter.all": "All",
"collection.filter.WHISKY": "Whisky",
"collection.filter.COGNAC": "Cognac",
"collection.filter.WINE": "Wine",
"collection.filter.OTHER": "Other",
"collection.status.OPENED": "Opened",
"collection.status.UNOPENED": "Sealed",
"collection.visibility.public": "Public",
"collection.visibility.private": "Private",
"collection.view.table": "Table",
"collection.view.card": "Card",
"collection.addBottle": "+ Add",
"collection.editBottle": "Edit",
"collection.deleteBottle": "Delete",
"collection.deleteConfirm": "Delete \"{{name}}\"?",
"collection.empty": "No bottles yet.",
"collection.emptyDesc": "Start adding your purchase records!",
"collection.form.title.add": "Add Bottle",
"collection.form.title.edit": "Edit Bottle",
"collection.form.spiritSearch": "Search spirit (or type manually)",
"collection.form.spiritName": "Name",
"collection.form.category": "Category",
"collection.form.purchaseDate": "Purchase Date",
"collection.form.price": "Price",
"collection.form.store": "Store",
"collection.form.batch": "Batch (optional)",
"collection.form.bottlingYear": "Bottling Year (optional)",
"collection.form.status": "Status",
"collection.form.isPublic": "Visibility",
"collection.form.isPublicDesc": "Public bottles are visible via your profile URL",
"collection.form.images": "Images (up to 2)",
"collection.form.memo": "Memo (optional)",
"collection.form.save": "Save",
"collection.form.cancel": "Cancel",
"collection.table.category": "Type",
"collection.table.purchaseDate": "Date",
"collection.table.name": "Name",
"collection.table.batch": "Batch",
"collection.table.bottlingYear": "Bottled",
"collection.table.price": "Price",
"collection.table.store": "Store",
"collection.table.status": "Status",
"collection.table.visibility": "Visibility",
"collection.table.actions": "Edit",
"collection.publicPage.title": "{{nickname}}'s Collection"
```

- [ ] **Step 6: 커밋**

```bash
git add drinkindex-web/src/domain/user-bottle/ \
        drinkindex-web/src/locales/ko.json \
        drinkindex-web/src/locales/en.json
git commit -m "feat(bottle): 프론트엔드 타입, API, Hooks, i18n 추가"
```

---

## Task 6: UI 컴포넌트 (Stats / FilterBar / Table / Card / List)

**Files:**
- Create: `drinkindex-web/src/domain/user-bottle/components/BottleStats.tsx`
- Create: `drinkindex-web/src/domain/user-bottle/components/BottleFilterBar.tsx`
- Create: `drinkindex-web/src/domain/user-bottle/components/BottleTable.tsx`
- Create: `drinkindex-web/src/domain/user-bottle/components/BottleCard.tsx`
- Create: `drinkindex-web/src/domain/user-bottle/components/BottleList.tsx`

- [ ] **Step 1: BottleStats 컴포넌트**

```tsx
// drinkindex-web/src/domain/user-bottle/components/BottleStats.tsx
import { useTranslation } from 'react-i18next';
import type { BottleStats as IBottleStats } from '../types/userBottle.types';

export function BottleStats({ stats }: { stats: IBottleStats }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3 px-4 py-3 bg-amber-50 rounded-lg text-sm text-gray-700">
      <span className="font-semibold">
        {t('collection.stats.totalBottles', { count: stats.totalCount })}
      </span>
      {stats.totalPrice > 0 && (
        <span>{t('collection.stats.totalPrice', { price: stats.totalPrice.toLocaleString() })}</span>
      )}
      <span className="text-green-600">
        {t('collection.stats.opened', { count: stats.openedCount })}
      </span>
      <span className="text-gray-500">
        {t('collection.stats.unopened', { count: stats.unopenedCount })}
      </span>
      {stats.categoryStats.map(cs => (
        <span key={cs.category} className="text-amber-700">
          {t(`collection.filter.${cs.category}`)} {cs.count}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: BottleFilterBar 컴포넌트**

```tsx
// drinkindex-web/src/domain/user-bottle/components/BottleFilterBar.tsx
import { useTranslation } from 'react-i18next';
import type { SpiritCategory, BottleStatus } from '../types/userBottle.types';

const CATS: (SpiritCategory | 'ALL')[] = ['ALL', 'WHISKY', 'COGNAC', 'WINE', 'OTHER'];
const STATUSES: (BottleStatus | 'ALL')[] = ['ALL', 'OPENED', 'UNOPENED'];

interface Props {
  category?: SpiritCategory;
  status?: BottleStatus;
  view: 'table' | 'card';
  onCategoryChange: (v?: SpiritCategory) => void;
  onStatusChange: (v?: BottleStatus) => void;
  onViewChange: (v: 'table' | 'card') => void;
  onAdd?: () => void;
}

export function BottleFilterBar({ category, status, view, onCategoryChange, onStatusChange, onViewChange, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex gap-1 flex-wrap">
        {CATS.map(c => (
          <button key={c}
            onClick={() => onCategoryChange(c === 'ALL' ? undefined : c)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              (c === 'ALL' && !category) || c === category
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {c === 'ALL' ? t('collection.filter.all') : t(`collection.filter.${c}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <select value={status ?? 'ALL'}
          onChange={e => onStatusChange(e.target.value === 'ALL' ? undefined : e.target.value as BottleStatus)}
          className="text-sm border border-gray-300 rounded px-2 py-1">
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s === 'ALL' ? t('collection.filter.all') : t(`collection.status.${s}`)}
            </option>
          ))}
        </select>
        <div className="hidden md:flex gap-1">
          {(['table', 'card'] as const).map(v => (
            <button key={v} onClick={() => onViewChange(v)}
              className={`px-2 py-1 text-sm rounded ${view === v ? 'bg-amber-500 text-white' : 'bg-gray-100'}`}>
              {v === 'table' ? '≡' : '⊞'}
            </button>
          ))}
        </div>
        {onAdd && (
          <button onClick={onAdd}
            className="px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 transition-colors">
            {t('collection.addBottle')}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: BottleTable 컴포넌트**

```tsx
// drinkindex-web/src/domain/user-bottle/components/BottleTable.tsx
import { useTranslation } from 'react-i18next';
import type { UserBottle } from '../types/userBottle.types';

interface Props {
  bottles: UserBottle[];
  editable?: boolean;
  onEdit?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
}

export function BottleTable({ bottles, editable, onEdit, onDelete, onToggleStatus, onTogglePublic }: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const displayName = (b: UserBottle) =>
    b.spiritId
      ? (isEn ? (b.spiritNameEn || b.spiritNameKo || '') : (b.spiritNameKo || ''))
      : (b.spiritNameText || '');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-amber-50 text-gray-600 text-left text-xs">
            {['category','purchaseDate','name','batch','bottlingYear','price','store','status'].map(k => (
              <th key={k} className="px-3 py-2 whitespace-nowrap font-medium">
                {t(`collection.table.${k}`)}
              </th>
            ))}
            {editable && <th className="px-3 py-2 text-center">{t('collection.table.visibility')}</th>}
            {editable && <th className="px-3 py-2 text-center">{t('collection.table.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {bottles.map(b => (
            <tr key={b.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2 text-amber-600 font-medium whitespace-nowrap text-xs">
                {t(`collection.filter.${b.category}`)}
              </td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{b.purchaseDate}</td>
              <td className="px-3 py-2 font-medium">{displayName(b)}</td>
              <td className="px-3 py-2 text-gray-400">{b.batch ?? '-'}</td>
              <td className="px-3 py-2 text-gray-400">{b.bottlingYear ?? '-'}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {b.price > 0 ? `₩${b.price.toLocaleString()}` : '-'}
              </td>
              <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{b.store}</td>
              <td className="px-3 py-2 text-center">
                <button onClick={() => editable && onToggleStatus?.(b.id)} disabled={!editable}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === 'OPENED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  } ${editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
                  {t(`collection.status.${b.status}`)}
                </button>
              </td>
              {editable && (
                <td className="px-3 py-2 text-center">
                  <button onClick={() => onTogglePublic?.(b.id)}
                    className={b.isPublic ? 'text-blue-500' : 'text-gray-300'}>
                    {b.isPublic ? '🔓' : '🔒'}
                  </button>
                </td>
              )}
              {editable && (
                <td className="px-3 py-2">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => onEdit?.(b)} className="text-gray-400 hover:text-amber-600 text-xs px-1">✏️</button>
                    <button onClick={() => onDelete?.(b)} className="text-gray-400 hover:text-red-500 text-xs px-1">🗑️</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: BottleCard 컴포넌트**

```tsx
// drinkindex-web/src/domain/user-bottle/components/BottleCard.tsx
import { useTranslation } from 'react-i18next';
import type { UserBottle } from '../types/userBottle.types';

interface Props {
  bottle: UserBottle;
  editable?: boolean;
  onEdit?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
}

export function BottleCard({ bottle: b, editable, onEdit, onDelete, onToggleStatus, onTogglePublic }: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const name = b.spiritId
    ? (isEn ? (b.spiritNameEn || b.spiritNameKo || '') : (b.spiritNameKo || ''))
    : (b.spiritNameText || '');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {b.imageUrls[0] && (
        <img src={b.imageUrls[0]} alt={name} className="w-full h-28 object-cover rounded-md mb-3" />
      )}
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          {t(`collection.filter.${b.category}`)}
        </span>
        {editable && (
          <button onClick={() => onTogglePublic?.(b.id)}
            className={`text-sm ${b.isPublic ? 'text-blue-500' : 'text-gray-300'}`}>
            {b.isPublic ? '🔓' : '🔒'}
          </button>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 text-sm leading-snug mt-1">{name}</h3>
      <p className="text-xs text-gray-400 mt-0.5">{b.purchaseDate} · {b.store}</p>
      {b.bottlingYear && <p className="text-xs text-gray-400">{b.bottlingYear}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-medium">
          {b.price > 0 ? `₩${b.price.toLocaleString()}` : '-'}
        </span>
        <button onClick={() => editable && onToggleStatus?.(b.id)} disabled={!editable}
          className={`text-xs px-2 py-0.5 rounded-full ${
            b.status === 'OPENED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          } ${editable ? 'cursor-pointer' : 'cursor-default'}`}>
          {t(`collection.status.${b.status}`)}
        </button>
      </div>
      {editable && (
        <div className="flex gap-3 mt-3 pt-2 border-t border-gray-100">
          <button onClick={() => onEdit?.(b)} className="text-xs text-gray-500 hover:text-amber-600">
            {t('collection.editBottle')}
          </button>
          <button onClick={() => onDelete?.(b)} className="text-xs text-gray-500 hover:text-red-500">
            {t('collection.deleteBottle')}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: BottleList 컨테이너 (뷰 전환)**

```tsx
// drinkindex-web/src/domain/user-bottle/components/BottleList.tsx
import { useTranslation } from 'react-i18next';
import type { UserBottle } from '../types/userBottle.types';
import { BottleTable } from './BottleTable';
import { BottleCard } from './BottleCard';

interface Props {
  bottles: UserBottle[];
  view: 'table' | 'card';
  editable?: boolean;
  onEdit?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
}

export function BottleList({ bottles, view, editable, onEdit, onDelete, onToggleStatus, onTogglePublic }: Props) {
  const { t } = useTranslation();
  const shared = { bottles, editable, onEdit, onDelete, onToggleStatus, onTogglePublic };

  if (bottles.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="font-medium">{t('collection.empty')}</p>
        <p className="text-sm mt-1">{t('collection.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <>
      {/* PC: view 상태 따름 */}
      <div className="hidden md:block">
        {view === 'table'
          ? <BottleTable {...shared} />
          : <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {bottles.map(b => <BottleCard key={b.id} bottle={b} editable={editable}
                onEdit={onEdit} onDelete={onDelete}
                onToggleStatus={onToggleStatus} onTogglePublic={onTogglePublic} />)}
            </div>
        }
      </div>
      {/* 모바일: 카드 고정 */}
      <div className="md:hidden grid grid-cols-1 gap-3 pt-2">
        {bottles.map(b => <BottleCard key={b.id} bottle={b} editable={editable}
          onEdit={onEdit} onDelete={onDelete}
          onToggleStatus={onToggleStatus} onTogglePublic={onTogglePublic} />)}
      </div>
    </>
  );
}
```

- [ ] **Step 6: 타입 체크**

```bash
cd drinkindex-web && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: 커밋**

```bash
git add drinkindex-web/src/domain/user-bottle/components/BottleStats.tsx \
        drinkindex-web/src/domain/user-bottle/components/BottleFilterBar.tsx \
        drinkindex-web/src/domain/user-bottle/components/BottleTable.tsx \
        drinkindex-web/src/domain/user-bottle/components/BottleCard.tsx \
        drinkindex-web/src/domain/user-bottle/components/BottleList.tsx
git commit -m "feat(bottle): UI 컴포넌트 (Stats, FilterBar, Table, Card, List)"
```

---

## Task 7: BottleFormModal

**Files:**
- Create: `drinkindex-web/src/domain/user-bottle/components/BottleFormModal.tsx`

- [ ] **Step 1: BottleFormModal 구현**

Spirit 검색은 `/api/spirits?keyword=...&size=5` 를 호출. 실제 API 경로는 기존 `spiritApi.ts`에서 확인 후 맞출 것.  
이미지 업로드는 저장 후 모달 내에서 `useUploadBottleImage` 훅으로 처리.

```tsx
// drinkindex-web/src/domain/user-bottle/components/BottleFormModal.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserBottle, UserBottleRequest, SpiritCategory, BottleStatus } from '../types/userBottle.types';
import { useCreateBottle, useUpdateBottle, useUploadBottleImage } from '../hooks/useUserBottle';

interface SpiritOption { id: number; nameKo: string; nameEn: string | null; category: string; }
interface Props { open: boolean; onClose: () => void; editing?: UserBottle; }

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER'];

const defaultForm = (): UserBottleRequest => ({
  category: 'WHISKY', purchaseDate: '', price: 0, store: '',
  status: 'UNOPENED', isPublic: false,
});

export function BottleFormModal({ open, onClose, editing }: Props) {
  const { t } = useTranslation();
  const createMut = useCreateBottle();
  const updateMut = useUpdateBottle();
  const uploadImageMut = useUploadBottleImage();

  const [spiritQuery, setSpiritQuery] = useState('');
  const [selectedSpirit, setSelectedSpirit] = useState<SpiritOption | null>(null);
  const [spiritOptions, setSpiritOptions] = useState<SpiritOption[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [form, setForm] = useState<UserBottleRequest>(defaultForm());

  useEffect(() => {
    if (!open) { setForm(defaultForm()); setSelectedSpirit(null); setSpiritQuery(''); setPendingImages([]); return; }
    if (editing) {
      setForm({
        spiritId: editing.spiritId ?? undefined,
        spiritNameText: editing.spiritNameText ?? undefined,
        category: editing.category, purchaseDate: editing.purchaseDate,
        batch: editing.batch ?? undefined, bottlingYear: editing.bottlingYear ?? undefined,
        price: editing.price, store: editing.store,
        status: editing.status, isPublic: editing.isPublic, memo: editing.memo ?? undefined,
      });
    }
  }, [open, editing]);

  useEffect(() => {
    if (spiritQuery.length < 2) { setSpiritOptions([]); return; }
    const timer = setTimeout(async () => {
      try {
        // 기존 Spirit 검색 API 경로 확인 필요 — spiritApi.ts 참조
        const res = await fetch(`/api/spirits?keyword=${encodeURIComponent(spiritQuery)}&size=5`);
        const json = await res.json();
        setSpiritOptions(json.data?.content ?? []);
      } catch { setSpiritOptions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [spiritQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UserBottleRequest = {
      ...form,
      spiritId: selectedSpirit?.id,
      spiritNameText: selectedSpirit ? undefined : (spiritQuery || form.spiritNameText),
    };
    let bottleId: number;
    if (editing) {
      const updated = await updateMut.mutateAsync({ id: editing.id, data: payload });
      bottleId = updated.id;
    } else {
      const created = await createMut.mutateAsync(payload);
      bottleId = created.id;
    }
    for (const file of pendingImages) {
      await uploadImageMut.mutateAsync({ id: bottleId, file });
    }
    onClose();
  };

  if (!open) return null;
  const isPending = createMut.isPending || updateMut.isPending || uploadImageMut.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b z-10">
          <h2 className="font-bold text-gray-900 text-base">
            {editing ? t('collection.form.title.edit') : t('collection.form.title.add')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 품명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.spiritName')}</label>
            <input type="text"
              value={selectedSpirit ? `${selectedSpirit.nameKo}${selectedSpirit.nameEn ? ` (${selectedSpirit.nameEn})` : ''}` : spiritQuery}
              onChange={e => { setSpiritQuery(e.target.value); setSelectedSpirit(null); }}
              placeholder={t('collection.form.spiritSearch')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            {spiritOptions.length > 0 && !selectedSpirit && (
              <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {spiritOptions.map(s => (
                  <li key={s.id}>
                    <button type="button"
                      onClick={() => { setSelectedSpirit(s); setSpiritQuery(''); setSpiritOptions([]); setForm(f => ({ ...f, category: s.category as SpiritCategory })); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50">
                      {s.nameKo}{s.nameEn ? ` (${s.nameEn})` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 종류 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.category')}</label>
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as SpiritCategory }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`collection.filter.${c}`)}</option>)}
            </select>
          </div>

          {/* 구매일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.purchaseDate')}</label>
            <input type="date" required value={form.purchaseDate}
              onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.price')}</label>
            <input type="number" min="0" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* 매장 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.store')}</label>
            <input type="text" required value={form.store}
              onChange={e => setForm(f => ({ ...f, store: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* 배치 / 병입년도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.batch')}</label>
              <input type="text" value={form.batch ?? ''}
                onChange={e => setForm(f => ({ ...f, batch: e.target.value || undefined }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.bottlingYear')}</label>
              <input type="text" value={form.bottlingYear ?? ''} placeholder="2022.02"
                onChange={e => setForm(f => ({ ...f, bottlingYear: e.target.value || undefined }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('collection.form.status')}</label>
            <div className="flex gap-4">
              {(['UNOPENED', 'OPENED'] as BottleStatus[]).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="status" value={s}
                    checked={form.status === s}
                    onChange={() => setForm(f => ({ ...f, status: s }))} />
                  <span className="text-sm">{t(`collection.status.${s}`)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 공개 여부 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('collection.form.isPublic')}</p>
              <p className="text-xs text-gray-400">{t('collection.form.isPublicDesc')}</p>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${form.isPublic ? 'bg-amber-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.images')}</label>
            <input type="file" accept="image/jpeg,image/png" multiple
              onChange={e => {
                const files = Array.from(e.target.files ?? []).slice(0, 2);
                setPendingImages(files);
              }}
              className="w-full text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-amber-50 file:text-amber-700" />
            {pendingImages.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">{pendingImages.length}장 선택됨</p>
            )}
            {editing && editing.imageUrls.length > 0 && (
              <div className="flex gap-2 mt-2">
                {editing.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('collection.form.memo')}</label>
            <textarea value={form.memo ?? ''} rows={2}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value || undefined }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              {t('collection.form.cancel')}
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">
              {t('collection.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add drinkindex-web/src/domain/user-bottle/components/BottleFormModal.tsx
git commit -m "feat(bottle): BottleFormModal (등록/수정/이미지 업로드)"
```

---

## Task 8: BottleCollectionTab + MyPage 탭 + 공개 컬렉션 페이지

**Files:**
- Create: `drinkindex-web/src/domain/user-bottle/components/BottleCollectionTab.tsx`
- Modify: `drinkindex-web/src/pages/MyPage.tsx`
- Create: `drinkindex-web/src/pages/UserBottlePublicPage.tsx`
- Modify: `drinkindex-web/src/App.tsx`

- [ ] **Step 1: BottleCollectionTab**

```tsx
// drinkindex-web/src/domain/user-bottle/components/BottleCollectionTab.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserBottle, SpiritCategory, BottleStatus } from '../types/userBottle.types';
import { useMyBottles, useDeleteBottle, useToggleBottleStatus, useToggleBottlePublic } from '../hooks/useUserBottle';
import { BottleStats } from './BottleStats';
import { BottleFilterBar } from './BottleFilterBar';
import { BottleList } from './BottleList';
import { BottleFormModal } from './BottleFormModal';

export function BottleCollectionTab() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<SpiritCategory | undefined>();
  const [status, setStatus] = useState<BottleStatus | undefined>();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserBottle | undefined>();

  const { data, isLoading } = useMyBottles({ category, status });
  const deleteMut = useDeleteBottle();
  const toggleStatusMut = useToggleBottleStatus();
  const togglePublicMut = useToggleBottlePublic();

  const handleDelete = (b: UserBottle) => {
    const name = b.spiritNameKo || b.spiritNameText || '';
    if (confirm(t('collection.deleteConfirm', { name }))) deleteMut.mutate(b.id);
  };

  if (isLoading) return <div className="py-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {data?.stats && <BottleStats stats={data.stats} />}
      <BottleFilterBar
        category={category} status={status} view={view}
        onCategoryChange={setCategory} onStatusChange={setStatus}
        onViewChange={setView}
        onAdd={() => { setEditing(undefined); setModalOpen(true); }}
      />
      <BottleList
        bottles={data?.bottles ?? []} view={view} editable
        onEdit={b => { setEditing(b); setModalOpen(true); }}
        onDelete={handleDelete}
        onToggleStatus={id => toggleStatusMut.mutate(id)}
        onTogglePublic={id => togglePublicMut.mutate(id)}
      />
      <BottleFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
```

- [ ] **Step 2: MyPage.tsx 에 collection 탭 추가**

`MyPage.tsx`를 열어서 다음 두 곳을 수정:

1. import 추가:
```tsx
import { BottleCollectionTab } from '@/domain/user-bottle/components/BottleCollectionTab';
```

2. 탭 배열에서 `byob` 항목 다음에 추가 (기존 탭 배열 패턴 그대로 따를 것):
```tsx
{ key: 'collection', label: t('mypage.collectionTab') },
```

3. 탭 렌더링 조건 블록에 추가:
```tsx
{activeTab === 'collection' && <BottleCollectionTab />}
```

- [ ] **Step 3: 공개 컬렉션 페이지**

```tsx
// drinkindex-web/src/pages/UserBottlePublicPage.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SpiritCategory } from '@/domain/user-bottle/types/userBottle.types';
import { usePublicBottles } from '@/domain/user-bottle/hooks/useUserBottle';
import { BottleStats } from '@/domain/user-bottle/components/BottleStats';
import { BottleFilterBar } from '@/domain/user-bottle/components/BottleFilterBar';
import { BottleList } from '@/domain/user-bottle/components/BottleList';

export default function UserBottlePublicPage() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const [category, setCategory] = useState<SpiritCategory | undefined>();
  const [view, setView] = useState<'table' | 'card'>('table');

  const { data, isLoading } = usePublicBottles(Number(userId), category);

  if (isLoading) return <div className="py-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">
        {t('collection.publicPage.title', { nickname: `#${userId}` })}
      </h1>
      {data?.stats && <BottleStats stats={data.stats} />}
      <BottleFilterBar
        category={category} status={undefined} view={view}
        onCategoryChange={setCategory} onStatusChange={() => {}} onViewChange={setView}
      />
      <BottleList bottles={data?.bottles ?? []} view={view} editable={false} />
    </div>
  );
}
```

- [ ] **Step 4: App.tsx에 라우트 추가**

`App.tsx`에서 `MainLayout` 내부의 Route 목록에 추가 (mypage Route 근처):

```tsx
import UserBottlePublicPage from '@/pages/UserBottlePublicPage';

// <Route element={<MainLayout />}> 안에 추가
<Route path="users/:userId/bottles" element={<UserBottlePublicPage />} />
```

- [ ] **Step 5: TypeScript 타입 체크**

```bash
cd drinkindex-web && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: 백엔드 전체 빌드 + 테스트**

```bash
cd drinkindex-api && ./gradlew build
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 7: 커밋**

```bash
git add drinkindex-web/src/domain/user-bottle/components/BottleCollectionTab.tsx \
        drinkindex-web/src/pages/MyPage.tsx \
        drinkindex-web/src/pages/UserBottlePublicPage.tsx \
        drinkindex-web/src/App.tsx
git commit -m "feat(bottle): BottleCollectionTab, MyPage 탭 추가, 공개 컬렉션 페이지"
```
