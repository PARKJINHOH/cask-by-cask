package com.caskbycask.domain.producer.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.FullTextField;
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.Indexed;

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
    @FullTextField(name = "nameKo_ngram", analyzer = "ngram_search")
    private String nameKo;

    @Column(nullable = false, length = 200)
    @Comment("생산자명(영문)")
    @FullTextField(analyzer = "korean_search")
    @FullTextField(name = "nameEn_ngram", analyzer = "ngram_search")
    private String nameEn;

    @Column(nullable = false, length = 100)
    @Comment("국가")
    private String country;

    @Column(length = 100)
    @Comment("지역")
    private String region;

    @Column(length = 500)
    @Comment("웹사이트")
    private String website;

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

    public void update(ProducerType type, String nameKo, String nameEn, String country, String region,
                       String website, Integer foundedYear, String descriptionKo, String descriptionEn,
                       String searchKeywords) {
        this.type = type;
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.country = country;
        this.region = region;
        this.website = website;
        this.foundedYear = foundedYear;
        this.descriptionKo = descriptionKo;
        this.descriptionEn = descriptionEn;
        this.searchKeywords = searchKeywords;
    }
}
