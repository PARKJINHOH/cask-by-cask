package com.drinkindex.domain.distillery.entity;

import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "distillery")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Distillery extends BaseTimeEntity {

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

    public void update(String nameKo, String nameEn, String country, String region) {
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.country = country;
        this.region = region;
    }
}
