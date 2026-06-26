package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
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
                @Index(name = "idx_spirit_producer_id", columnList = "producer_id")
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

    @Column(length = 200)
    @Comment("병입자")
    private String bottler;

    @Column
    @Comment("병입 연도")
    private Integer bottledYear;

    @Column
    @Comment("빈티지 연도")
    private Integer vintageYear;

    @Column(precision = 4, scale = 1)
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

    @Column(precision = 4, scale = 1)
    @Comment("평균 평점")
    @GenericField(sortable = Sortable.YES)
    private BigDecimal avgScore;

    @Builder.Default
    @Column(nullable = false)
    @Comment("리뷰 수")
    @GenericField(sortable = Sortable.YES)
    private Integer reviewCount = 0;

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
    @Comment("에디션 유형 — BATCH/RELEASE_YEAR/SINGLE_CASK/NONE")
    private VariantType variantType;

    @Column(length = 100)
    @Comment("에디션 식별 값")
    private String variantValue;

    @Column(length = 100)
    @Comment("에디션 식별 값(영문)")
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

    @Column(precision = 4, scale = 1)
    @Comment("최소 도수(%)")
    private BigDecimal abvMin;

    @Column(precision = 4, scale = 1)
    @Comment("최대 도수(%)")
    private BigDecimal abvMax;

    @Column
    @Comment("최소 용량(ml)")
    private Integer volumeMlMin;

    @Column
    @Comment("최대 용량(ml)")
    private Integer volumeMlMax;

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
                       Producer producer, String bottler, Integer bottledYear,
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
        this.bottler = bottler;
        this.bottledYear = bottledYear;
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

    /** 하위 에디션 표시 순서 지정 (마스터 화면에서의 목록 순서 보존용) */
    public void assignDisplayOrder(Integer order) {
        this.displayOrder = order;
    }

    public void addVariant(Spirit variant) {
        this.variants.add(variant);
        variant.parent = this;
    }

    public void updateAvgScore(BigDecimal avgScore, int reviewCount) {
        this.avgScore = avgScore;
        this.reviewCount = reviewCount;
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
