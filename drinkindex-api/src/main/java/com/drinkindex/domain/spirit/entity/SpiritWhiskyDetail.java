package com.drinkindex.domain.spirit.entity;

import com.drinkindex.domain.spirit.entity.enums.*;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "spirit_whisky_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SpiritWhiskyDetail {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WhiskyStyle style;

    /** OB=Official Bottling, IB=Independent Bottling */
    @Enumerated(EnumType.STRING)
    @Column(length = 5)
    private BottlingType bottlingType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WhiskyCaskType caskType;

    /** FULL_MATURATION=단일 캐스크 전체 숙성, FINISH=주 숙성 후 이동 */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MaturationStyle maturationStyle;

    /** maturationStyle=FINISH 일 때만 유효 */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WhiskyCaskType finishCaskType;

    /** Non-Chill Filtered: 저온 여과 생략 → 풍미 보존 */
    @Column
    private Boolean isNonChillFiltered;

    /** Natural Colour: 캐러멜 색소(E150a) 무첨가 */
    @Column
    private Boolean isNaturalColour;

    /** 단일 캐스크 병입 여부 */
    @Column
    private Boolean isSingleCask;

    /** 가수 없이 캐스크 원액 그대로 병입 */
    @Column
    private Boolean isCaskStrength;

    /** 피트(이탄) 사용 여부 */
    @Column
    private Boolean isPeated;

    /** 피트 강도 (ppm). isPeated=true 일 때만 유효. */
    @Column
    private Integer phenolPpm;

    /** JSON: { "caskNo": "", "finishCaskDetail": "" } */
    @Column(columnDefinition = "TEXT")
    private String extraData;

    public void update(WhiskyStyle style, BottlingType bottlingType, WhiskyCaskType caskType,
                       MaturationStyle maturationStyle, WhiskyCaskType finishCaskType,
                       Boolean isNonChillFiltered, Boolean isNaturalColour,
                       Boolean isSingleCask, Boolean isCaskStrength,
                       Boolean isPeated, Integer phenolPpm, String extraData) {
        this.style               = style;
        this.bottlingType        = bottlingType;
        this.caskType            = caskType;
        this.maturationStyle     = maturationStyle;
        this.finishCaskType      = finishCaskType;
        this.isNonChillFiltered  = isNonChillFiltered;
        this.isNaturalColour     = isNaturalColour;
        this.isSingleCask        = isSingleCask;
        this.isCaskStrength      = isCaskStrength;
        this.isPeated            = isPeated;
        this.phenolPpm           = phenolPpm;
        this.extraData           = extraData;
    }
}
