package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.spirit.entity.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "spirit_whisky_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류 상세 - 위스키")
public class SpiritWhiskyDetail {

    @Id
    @Comment("주류(spirit.id, PK)")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("위스키 스타일 — SINGLE_MALT/BLENDED_MALT/BLENDED_WHISKY/GRAIN_CORN/BOURBON/WHEATED_BOURBON/RYE/POT_STILL/TENNESSEE/OTHER")
    private WhiskyStyle style;

    /** OB=Official Bottling, IB=Independent Bottling */
    @Enumerated(EnumType.STRING)
    @Column(length = 5)
    @Comment("병입 유형 — OB(공식)/IB(독립)")
    private BottlingType bottlingType;

    /** Non-Chill Filtered: 저온 여과 생략 → 풍미 보존 */
    @Column
    @Comment("비냉각여과 여부")
    private Boolean isNonChillFiltered;

    /** Natural Colour: 캐러멜 색소(E150a) 무첨가 */
    @Column
    @Comment("무착색 여부")
    private Boolean isNaturalColour;

    /** 단일 캐스크 병입 여부 */
    @Column
    @Comment("싱글 캐스크 여부")
    private Boolean isSingleCask;

    /** 가수 없이 캐스크 원액 그대로 병입 */
    @Column
    @Comment("캐스크 스트렝스 여부")
    private Boolean isCaskStrength;

    /** 피트(이탄) 사용 여부 */
    @Column
    @Comment("피트 사용 여부")
    private Boolean isPeated;

    /** 피트 강도 (ppm). isPeated=true 일 때만 유효. */
    @Column
    @Comment("페놀 수치(ppm)")
    private Integer phenolPpm;

    @Column(name = "phenol_ppm_min")
    @Comment("최소 페놀 수치(ppm)")
    private Integer phenolPpmMin;

    @Column(name = "phenol_ppm_max")
    @Comment("최대 페놀 수치(ppm)")
    private Integer phenolPpmMax;

    /** JSON: { "styleOther": "", "caskNo": "", "caskTypes": ["EX_SHERRY", ...], "caskTypeOther": "" } */
    @Column(columnDefinition = "TEXT")
    @Comment("추가 데이터(JSON)")
    private String extraData;

    public void update(WhiskyStyle style, BottlingType bottlingType,
                       Boolean isNonChillFiltered, Boolean isNaturalColour,
                       Boolean isSingleCask, Boolean isCaskStrength,
                       Boolean isPeated, Integer phenolPpm, Integer phenolPpmMin, Integer phenolPpmMax, String extraData) {
        this.style               = style;
        this.bottlingType        = bottlingType;
        this.isNonChillFiltered  = isNonChillFiltered;
        this.isNaturalColour     = isNaturalColour;
        this.isSingleCask        = isSingleCask;
        this.isCaskStrength      = isCaskStrength;
        this.isPeated            = isPeated;
        this.phenolPpm           = Boolean.TRUE.equals(isPeated) ? phenolPpm : null;
        this.phenolPpmMin        = Boolean.TRUE.equals(isPeated) ? phenolPpmMin : null;
        this.phenolPpmMax        = Boolean.TRUE.equals(isPeated) ? phenolPpmMax : null;
        this.extraData           = extraData;
    }
}
