package com.drinkindex.domain.spirit.entity;

import com.drinkindex.domain.spirit.entity.enums.*;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "spirit_wine_detail",
        indexes = @Index(name = "idx_wine_vintage", columnList = "vintage")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SpiritWineDetail {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WineType wineType;

    /** 포도 수확 연도 — 와인의 핵심 식별자 */
    @Column
    private Integer vintage;

    /** 오크 숙성 여부 */
    @Column
    private Boolean isOakAged;

    /** 개입 최소화, 무첨가 양조 방식 */
    @Column
    private Boolean isNaturalWine;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WineCertification certification;

    /**
     * JSON: {
     *   "grapeVarieties": [{"name":"Cabernet Sauvignon","percentage":70}],
     *   "appellationDesignation": "AOC Bordeaux",
     *   "soilType": "Limestone",
     *   "altitudeM": 450,
     *   "harvestMethod": "Hand-picked",
     *   "fermentationVessel": "Stainless Steel",
     *   "oakType": "French Oak",
     *   "oakAgedMonths": 18
     * }
     */
    @Column(columnDefinition = "TEXT")
    private String extraData;

    public void update(WineType wineType, Integer vintage, Boolean isOakAged,
                       Boolean isNaturalWine, WineCertification certification, String extraData) {
        this.wineType      = wineType;
        this.vintage       = vintage;
        this.isOakAged     = isOakAged;
        this.isNaturalWine = isNaturalWine;
        this.certification = certification;
        this.extraData     = extraData;
    }
}
