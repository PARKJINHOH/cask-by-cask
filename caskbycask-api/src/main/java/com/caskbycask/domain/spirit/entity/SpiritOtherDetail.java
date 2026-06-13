package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "spirit_other_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SpiritOtherDetail {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    /** 기타 주종 (럼, 진, 보드카, 데킬라 등) */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private OtherSpiritType otherType;

    /** JSON: { "mainIngredient": "", "productionMethod": "", "notes": "" } */
    @Column(columnDefinition = "TEXT")
    private String extraData;

    public void update(OtherSpiritType otherType, String extraData) {
        this.otherType = otherType;
        this.extraData = extraData;
    }
}
