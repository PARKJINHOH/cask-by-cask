package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "spirit_other_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류 상세 - 기타 주종")
public class SpiritOtherDetail {

    @Id
    @Comment("주류(spirit.id, PK)")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    /** 기타 주종 (럼, 진, 보드카, 데킬라 등) */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("기타 주종 — RUM/GIN/VODKA/TEQUILA/MEZCAL/BRANDY/LIQUEUR/SAKE/SOJU/BAIJIU/BEER/ABSINTHE/OTHER")
    private OtherSpiritType otherType;

    /** JSON: { "mainIngredient": "", "productionMethod": "", "notes": "" } */
    @Column(columnDefinition = "TEXT")
    @Comment("추가 데이터(JSON)")
    private String extraData;

    public void update(OtherSpiritType otherType, String extraData) {
        this.otherType = otherType;
        this.extraData = extraData;
    }
}
