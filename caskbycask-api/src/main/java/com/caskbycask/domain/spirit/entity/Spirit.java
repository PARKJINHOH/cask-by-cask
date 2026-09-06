package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import com.caskbycask.domain.spirit.support.SpiritSearchTextNormalizer;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.*;
import org.hibernate.search.mapper.pojo.automaticindexing.ReindexOnUpdate;
import org.hibernate.search.engine.backend.types.Sortable;

import static jakarta.persistence.CascadeType.ALL;
import static jakarta.persistence.FetchType.LAZY;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "spirit",
        indexes = {
                @Index(name = "idx_spirit_category", columnList = "category"),
                @Index(name = "idx_spirit_status", columnList = "status"),
                @Index(name = "idx_spirit_producer_id", columnList = "producer_id"),
                @Index(name = "idx_spirit_vintage_year", columnList = "vintage_year"),
                @Index(name = "idx_spirit_region_code", columnList = "region_code")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류(위스키/와인/꼬냑/기타)")
@Indexed
public class Spirit extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, length = 200)
    @Comment("주류명(한글)")
    @FullTextField(analyzer = "korean_search")
    @FullTextField(name = "nameKo_ngram", analyzer = "ngram_search", searchAnalyzer = "korean_search")
    private String nameKo;

    @Column(nullable = false, length = 200)
    @Comment("주류명(영문)")
    @FullTextField(analyzer = "english_search")
    @FullTextField(name = "nameEn_ngram", analyzer = "ngram_search", searchAnalyzer = "english_search")
    private String nameEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("카테고리 — WHISKY/WINE/COGNAC/OTHER")
    @KeywordField
    private SpiritCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producer_id")
    @Comment("생산자(producer.id)")
    @IndexedEmbedded
    @IndexingDependency(reindexOnUpdate = ReindexOnUpdate.SHALLOW)
    private Producer producer;

    @Column
    @Comment("빈티지 연도")
    @GenericField
    private Integer vintageYear;

    @Column(precision = 6, scale = 3)
    @Comment("도수(%)")
    @GenericField
    private BigDecimal abv;

    @Column
    @Comment("용량(ml)")
    private Integer volumeMl;

    @Column(length = 100)
    @Comment("국가")
    @KeywordField
    private String country;

    @Column(length = 100)
    @Comment("지역")
    @KeywordField
    private String region;

    /**
     * 산지 코드 — 산지 지도 표시용. 와인·위스키·꼬냑·기타(브랜디·전통주) 모두 사용한다.
     *
     * <p>{@code region}(한글 지역명 텍스트)과 병행 저장한다. {@code region} 은 기존 지역 필터·검색·SEO 가
     * 사용하는 값이라 그대로 두고, 이 필드가 지정되면 서비스가 {@code region} 을 L1 산지명으로 동기화한다.
     *
     * <p>검색 인덱스 대상이 아니다 — Hibernate Search 애노테이션을 붙이지 않아 리인덱싱이 필요 없다.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "region_code", length = 40)
    @Comment("산지 코드(WineRegion) — 지도 표시용")
    private WineRegion regionCode;

    @Column(precision = 4, scale = 1)
    @Comment("평균 평점")
    @GenericField(sortable = Sortable.YES)
    private BigDecimal avgScore;

    @Builder.Default
    @Column(nullable = false)
    @Comment("리뷰 수")
    @GenericField(sortable = Sortable.YES)
    private Integer reviewCount = 0;

    /**
     * avgScore 를 낸 모수 — 점수를 남긴 리뷰만 센다.
     *
     * <p>reviewCount 는 점수 없는 리뷰까지 포함한 "총 리뷰 수"라 평점 옆에 그대로 쓰면
     * "85.0 · 리뷰 12개"인데 실제 평균은 8건짜리인 어긋남이 생긴다. SEO aggregateRating 의
     * ratingCount 도 실제 평점 수와 맞아야 해서 이 값을 쓴다.
     */
    @Builder.Default
    @Column(nullable = false)
    @Comment("점수가 있는 리뷰 수(평균 산출 모수)")
    private Integer scoredReviewCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("조회수")
    private Integer viewCount = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("상태 — ACTIVE/HIDDEN/PENDING")
    @KeywordField
    private SpiritStatus status = SpiritStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by_id")
    @Comment("등록자(users.id)")
    private User registeredBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @Comment("마스터 주류(parent_id)")
    private Spirit parent;

    @Builder.Default
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Spirit> variants = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("에디션 유형 — BATCH/RELEASE_YEAR/SINGLE_CASK/VINTAGE/NONE")
    private VariantType variantType;

    @Column(length = 100)
    @Comment("에디션 식별 값")
    @FullTextField(analyzer = "korean_search")
    @FullTextField(name = "variantValue_ngram", analyzer = "ngram_search", searchAnalyzer = "korean_search")
    private String variantValue;

    @Column(length = 100)
    @Comment("에디션 식별 값(영문)")
    @FullTextField(analyzer = "english_search")
    @FullTextField(name = "variantValueEn_ngram", analyzer = "ngram_search", searchAnalyzer = "english_search")
    private String variantValueEn;

    @Column(length = 100)
    @Comment("에디션 목록 표시에 사용할 시리즈 식별자")
    @FullTextField(analyzer = "korean_search")
    @FullTextField(name = "seriesIdentifier_ngram", analyzer = "ngram_search", searchAnalyzer = "korean_search")
    private String seriesIdentifier;

    @Column(length = 100)
    @Comment("에디션 목록 표시용 시리즈 식별자(영문)")
    @FullTextField(analyzer = "english_search")
    @FullTextField(name = "seriesIdentifierEn_ngram", analyzer = "ngram_search", searchAnalyzer = "english_search")
    private String seriesIdentifierEn;

    @Column
    @Comment("하위 에디션 표시 순서 (마스터 기준 0부터, 마스터/일반 술은 null)")
    private Integer displayOrder;

    @Column(precision = 6, scale = 3)
    @Comment("최소 도수(%)")
    private BigDecimal abvMin;

    @Column(precision = 6, scale = 3)
    @Comment("최대 도수(%)")
    private BigDecimal abvMax;

    @Column
    @Comment("최소 용량(ml)")
    private Integer volumeMlMin;

    @Column
    @Comment("최대 용량(ml)")
    private Integer volumeMlMax;

    @Column(length = 30)
    @Comment("외부 데이터 제공자")
    private String sourceProvider;

    @Column(length = 1000)
    @Comment("외부 원문 URL")
    private String sourceUrl;

    @Column(length = 1000)
    @Comment("이용 허가된 외부 대표 이미지 URL")
    private String sourceImageUrl;

    @Column(precision = 3, scale = 2)
    @Comment("외부 제공자 평점")
    private BigDecimal sourceRating;

    @Comment("외부 제공자 평점 참여 수")
    private Integer sourceRatingCount;

    @Transient
    @KeywordField(name = "searchTextKoCompact")
    @IndexingDependency(derivedFrom = {
            @ObjectPath(@PropertyValue(propertyName = "nameKo")),
            @ObjectPath(@PropertyValue(propertyName = "seriesIdentifier")),
            @ObjectPath(@PropertyValue(propertyName = "variantValue")),
            @ObjectPath(@PropertyValue(propertyName = "category")),
            @ObjectPath(@PropertyValue(propertyName = "vintageYear")),
            @ObjectPath({
                    @PropertyValue(propertyName = "wineDetail"),
                    @PropertyValue(propertyName = "vintageStatus")
            })
    })
    public String getSearchTextKoCompact() {
        return SpiritSearchTextNormalizer.compact(
                nameKo, seriesIdentifier, variantValue,
                wineVintageSearchToken());
    }

    @Transient
    @KeywordField(name = "searchTextEnCompact")
    @IndexingDependency(derivedFrom = {
            @ObjectPath(@PropertyValue(propertyName = "nameEn")),
            @ObjectPath(@PropertyValue(propertyName = "seriesIdentifierEn")),
            @ObjectPath(@PropertyValue(propertyName = "variantValueEn")),
            @ObjectPath(@PropertyValue(propertyName = "category")),
            @ObjectPath(@PropertyValue(propertyName = "vintageYear")),
            @ObjectPath({
                    @PropertyValue(propertyName = "wineDetail"),
                    @PropertyValue(propertyName = "vintageStatus")
            })
    })
    public String getSearchTextEnCompact() {
        return SpiritSearchTextNormalizer.compact(
                nameEn, seriesIdentifierEn, variantValueEn,
                wineVintageSearchToken());
    }

    private String wineVintageSearchToken() {
        if (category != SpiritCategory.WINE) {
            return null;
        }
        if (vintageYear != null) {
            return vintageYear.toString();
        }
        return wineDetail != null && wineDetail.getVintageStatus() == WineVintageStatus.NON_VINTAGE
                ? "NV"
                : null;
    }

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private SpiritCommonDetail commonDetail;

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    @IndexedEmbedded
    @IndexingDependency(reindexOnUpdate = ReindexOnUpdate.SHALLOW)
    private SpiritWhiskyDetail whiskyDetail;

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    @IndexedEmbedded
    @IndexingDependency(reindexOnUpdate = ReindexOnUpdate.SHALLOW)
    private SpiritWineDetail wineDetail;

    public void attachWineDetail(SpiritWineDetail wineDetail) {
        this.wineDetail = wineDetail;
    }

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    @IndexedEmbedded
    @IndexingDependency(reindexOnUpdate = ReindexOnUpdate.SHALLOW)
    private SpiritCognacDetail cognacDetail;

    @Transient
    @GenericField(name = "hasParent")
    @IndexingDependency(derivedFrom = @ObjectPath(@PropertyValue(propertyName = "parent")))
    public boolean isHasParent() {
        return parent != null;
    }

    @OneToOne(mappedBy = "spirit", cascade = ALL, orphanRemoval = true, fetch = LAZY)
    private SpiritOtherDetail otherDetail;

    public void update(String nameKo, String nameEn, SpiritCategory category,
                       Producer producer,
                       Integer vintageYear, BigDecimal abv, Integer volumeMl,
                       String country, String region,
                       Spirit parent, VariantType variantType, String variantValue, String variantValueEn,
                       String seriesIdentifier, String seriesIdentifierEn,
                       BigDecimal abvMin, BigDecimal abvMax,
                       Integer volumeMlMin, Integer volumeMlMax) {
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.category = category;
        this.producer = producer;
        this.vintageYear = vintageYear;
        this.abv = abv;
        this.volumeMl = volumeMl;
        this.country = country;
        this.region = region;
        this.parent = parent;
        this.variantType = variantType;
        this.variantValue = variantValue;
        this.variantValueEn = variantValueEn;
        this.seriesIdentifier = seriesIdentifier;
        this.seriesIdentifierEn = seriesIdentifierEn;
        this.abvMin = abvMin;
        this.abvMax = abvMax;
        this.volumeMlMin = volumeMlMin;
        this.volumeMlMax = volumeMlMax;
    }

    /**
     * 에디션이 없던 주류를 에디션 마스터로 승격시킨다.
     *
     * <p>기존 주류에 첫 에디션을 붙일 때만 쓴다. 이름·규격 같은 나머지는 건들지 않는다 —
     * {@code update(...)} 를 쓰면 전달하지 않은 필드까지 함께 덮어쓴다.
     */
    public void promoteToVariantMaster(VariantType variantType, String seriesIdentifier, String seriesIdentifierEn) {
        this.variantType = variantType;
        this.seriesIdentifier = seriesIdentifier;
        this.seriesIdentifierEn = seriesIdentifierEn;
    }

    /** 하위 에디션 표시 순서 지정 (마스터 화면에서의 목록 순서 보존용) */
    public void assignDisplayOrder(Integer order) {
        this.displayOrder = order;
    }

    /**
     * 산지 코드 지정. {@code null} 은 산지 미지정(해제)을 뜻한다.
     *
     * <p>파라미터가 21개인 {@link #update} 에 넣지 않고 별도 메서드로 분리했다 —
     * 기존 호출부(에디션 분리·숨김 처리 등)의 인자 순서를 건드리지 않아 회귀 위험이 없다.
     * {@code region} 텍스트 동기화는 서비스가 담당한다.
     */
    public void assignRegionCode(WineRegion regionCode) {
        this.regionCode = regionCode;
    }

    public void assignExternalSource(String provider, String url, String imageUrl,
                                     BigDecimal rating, Integer ratingCount) {
        this.sourceProvider = provider;
        this.sourceUrl = url;
        this.sourceImageUrl = imageUrl;
        this.sourceRating = rating;
        this.sourceRatingCount = ratingCount;
    }

    public void rename(String nameKo, String nameEn) {
        this.nameKo = nameKo;
        this.nameEn = nameEn;
    }

    public void addVariant(Spirit variant) {
        this.variants.add(variant);
        variant.parent = this;
    }

    /**
     * @param reviewCount       총 리뷰 수 — 점수를 안 남긴 리뷰까지 센다 ("리뷰 N개" 표시용)
     * @param scoredReviewCount {@code avgScore} 를 낸 모수 — 점수가 있는 리뷰만 (평점 옆 표기·SEO ratingCount 용)
     */
    public void updateAvgScore(BigDecimal avgScore, int reviewCount, int scoredReviewCount) {
        this.avgScore = avgScore;
        this.reviewCount = reviewCount;
        this.scoredReviewCount = scoredReviewCount;
    }

    public void approve() {
        this.status = SpiritStatus.ACTIVE;
    }

    public void hide() {
        this.status = SpiritStatus.HIDDEN;
    }

    public void activate() {
        this.status = SpiritStatus.ACTIVE;
    }

    /** 카테고리 변경 시 기존 서브 테이블 row 제거 (orphanRemoval이 처리) */
    public void clearCategoryDetail() {
        this.whiskyDetail = null;
        this.wineDetail = null;
        this.cognacDetail = null;
        this.otherDetail = null;
    }
}
