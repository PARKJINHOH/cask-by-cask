package com.drinkindex.domain.producer.entity;

import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "producer")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Producer extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private ProducerType type = ProducerType.DISTILLERY;

    @Column(nullable = false, length = 200)
    private String nameKo;

    @Column(nullable = false, length = 200)
    private String nameEn;

    @Column(nullable = false, length = 100)
    private String country;

    @Column(length = 100)
    private String region;

    @Column(length = 500)
    private String website;

    @Column
    private Integer foundedYear;

    @Column(columnDefinition = "TEXT")
    private String descriptionKo;

    @Column(columnDefinition = "TEXT")
    private String descriptionEn;

    /** 검색 별칭 — 한글 음차 표기 변형 등 (예: 카뮈 ↔ 까뮤). 공백/콤마로 구분, 표시엔 미사용. */
    @Column(length = 300)
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
