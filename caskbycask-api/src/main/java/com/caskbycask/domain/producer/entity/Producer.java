package com.caskbycask.domain.producer.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.FullTextField;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.Indexed;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.IndexingDependency;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.KeywordField;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.ObjectPath;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.PropertyValue;

import com.caskbycask.domain.spirit.support.SpiritSearchTextNormalizer;

@Entity
@Table(name = "producer")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("생산자(증류소/와이너리/꼬냑하우스)")
@Indexed
public class Producer extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    @org.hibernate.search.mapper.pojo.mapping.definition.annotation.GenericField
    private Long id;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("생산자 유형 — DISTILLERY/WINERY/COGNAC_HOUSE/OTHER")
    private ProducerType type = ProducerType.DISTILLERY;

    @Column(nullable = false, length = 200)
    @Comment("생산자명(한글)")
    @FullTextField(analyzer = "korean_search")
    @FullTextField(name = "nameKo_ngram", analyzer = "ngram_search", searchAnalyzer = "korean_search")
    private String nameKo;

    @Column(nullable = false, length = 200)
    @Comment("생산자명(영문)")
    @FullTextField(analyzer = "english_search")
    @FullTextField(name = "nameEn_ngram", analyzer = "ngram_search", searchAnalyzer = "english_search")
    private String nameEn;

    @Column(nullable = false, length = 100)
    @Comment("국가")
    private String country;

    @Column(length = 100)
    @Comment("지역")
    private String region;

    /**
     * 자유 입력 지역을 현재 산지 카탈로그에 연결하는 코드.
     * 복수 산지처럼 하나로 확정할 수 없는 생산자는 null 로 두고 주류별로 산지를 선택한다.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "region_code", length = WineRegion.MAX_CODE_LENGTH)
    @Comment("기본 산지 코드(WineRegion) — 주류 등록 시 제안값")
    private WineRegion regionCode;

    @Column(length = 500)
    @Comment("웹사이트")
    private String website;

    /**
     * 로고 이미지. 포토카드에 증류소 로고를 얹기 위해 도입했다.
     * <p>
     * URL 만이 아니라 저장 파일명·하위 경로를 함께 들고 있는 이유: 저장 경로가 연월 디렉토리라
     * ({@code producers/202608}) URL 만으로는 교체·삭제 시 원본 파일을 찾을 수 없다.
     * <p>
     * Hibernate Search 애노테이션을 붙이지 않는다 — 검색 인덱스 스키마를 건드리면 재색인이 필요하다.
     */
    @Column(length = 500)
    @Comment("로고 이미지 URL")
    private String logoImageUrl;

    @Column(length = 255)
    @Comment("로고 저장 파일명")
    private String logoSavedFileName;

    @Column(length = 200)
    @Comment("로고 저장 하위 경로")
    private String logoSubPath;

    @Column
    @Comment("설립 연도")
    private Integer foundedYear;

    @Column(columnDefinition = "TEXT")
    @Comment("설명(한글)")
    private String descriptionKo;

    @Column(columnDefinition = "TEXT")
    @Comment("설명(영문)")
    private String descriptionEn;

    /** 검색 별칭 — 한글 음차 표기 변형 등 (예: 카뮈 ↔ 까뮤). 공백/콤마로 구분, 표시엔 미사용. */
    @Column(length = 300)
    @Comment("검색 별칭(공백/콤마 구분)")
    @FullTextField(analyzer = "korean_search")
    private String searchKeywords;

    @Transient
    @KeywordField(name = "searchTextKoCompact")
    @IndexingDependency(derivedFrom = {
            @ObjectPath(@PropertyValue(propertyName = "nameKo")),
            @ObjectPath(@PropertyValue(propertyName = "searchKeywords"))
    })
    public String getSearchTextKoCompact() {
        return SpiritSearchTextNormalizer.compact(nameKo, searchKeywords);
    }

    @Transient
    @KeywordField(name = "searchTextEnCompact")
    @IndexingDependency(derivedFrom = {
            @ObjectPath(@PropertyValue(propertyName = "nameEn")),
            @ObjectPath(@PropertyValue(propertyName = "searchKeywords"))
    })
    public String getSearchTextEnCompact() {
        return SpiritSearchTextNormalizer.compact(nameEn, searchKeywords);
    }

    public void update(ProducerType type, String nameKo, String nameEn, String country, String region,
                       WineRegion regionCode,
                       String website, Integer foundedYear, String descriptionKo, String descriptionEn,
                       String searchKeywords) {
        this.type = type;
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.country = country;
        this.region = region;
        this.regionCode = regionCode;
        this.website = website;
        this.foundedYear = foundedYear;
        this.descriptionKo = descriptionKo;
        this.descriptionEn = descriptionEn;
        this.searchKeywords = searchKeywords;
    }

    /**
     * 로고 교체. update() 시그니처를 건드리지 않고 별도 메서드로 둔다 —
     * UpdateProducerRequest 가 "null = 변경 안 함" 규약이라 JSON 필드로는 '삭제'를 표현할 수 없다.
     */
    public void updateLogo(String imageUrl, String savedFileName, String subPath) {
        this.logoImageUrl = imageUrl;
        this.logoSavedFileName = savedFileName;
        this.logoSubPath = subPath;
    }

    public void removeLogo() {
        this.logoImageUrl = null;
        this.logoSavedFileName = null;
        this.logoSubPath = null;
    }
}
