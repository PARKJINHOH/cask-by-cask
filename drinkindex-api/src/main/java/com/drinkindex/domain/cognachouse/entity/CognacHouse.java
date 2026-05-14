package com.drinkindex.domain.cognachouse.entity;

import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cognac_house")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class CognacHouse extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    public void update(String nameKo, String nameEn, String country, String region,
                       String website, Integer foundedYear, String descriptionKo, String descriptionEn) {
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.country = country;
        this.region = region;
        this.website = website;
        this.foundedYear = foundedYear;
        this.descriptionKo = descriptionKo;
        this.descriptionEn = descriptionEn;
    }
}
