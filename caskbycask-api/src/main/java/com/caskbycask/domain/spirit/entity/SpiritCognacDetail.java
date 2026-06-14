package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.spirit.entity.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "spirit_cognac_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류 상세 - 꼬냑")
public class SpiritCognacDetail {

    @Id
    @Comment("주류(spirit.id, PK)")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    /**
     * 공식 등급 순서: VS(2년) → Napoléon(6년) → VSOP(4년) → XO(10년) → XXO(14년) → Hors d'Age(30년+)
     * Napoléon은 2018년 BNIC 재정비 등급
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("등급 — VS/VSOP/NAPOLEON/XO/XXO/HORS_DAGE")
    private CognacGrade grade;

    /**
     * 원산지 세부 등급. Grande Champagne이 최상위.
     * '샴페인'과 이름만 같고 다른 지역 (포도 토양 품질 기준)
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("크뤼(원산지) — GRANDE_CHAMPAGNE/PETITE_CHAMPAGNE/BORDERIES/FINS_BOIS/BONS_BOIS")
    private CognacCru cru;

    /** Fine Champagne = Grande + Petite Champagne 블렌드 (Grande 50%+) */
    @Column
    @Comment("핀 샹파뉴 여부")
    private Boolean isFineChampagne;

    /** JSON: { "blendDetail": "" } */
    @Column(columnDefinition = "TEXT")
    @Comment("추가 데이터(JSON)")
    private String extraData;

    public void update(CognacGrade grade, CognacCru cru, Boolean isFineChampagne, String extraData) {
        this.grade          = grade;
        this.cru            = cru;
        this.isFineChampagne = isFineChampagne;
        this.extraData      = extraData;
    }
}
