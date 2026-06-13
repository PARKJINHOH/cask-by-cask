package com.caskbycask.domain.spirit.entity;

import com.caskbycask.domain.spirit.entity.enums.VariantLinkType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 연관 술(다른 배치·병입) 수동 오버라이드 — 한 쌍(pair)당 1행.
 * <p>
 * 양방향 표현을 위해 항상 <b>정규화(spiritId = min, relatedSpiritId = max)</b> 하여 저장한다.
 * 표시 목록 = (이름 자동 매치 ∪ MANUAL) − EXCLUDED.
 */
@Entity
@Table(
        name = "spirit_variant_link",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_spirit_variant_link_pair",
                columnNames = {"spirit_id", "related_spirit_id"}
        ),
        indexes = {
                @Index(name = "idx_spirit_variant_link_spirit", columnList = "spirit_id"),
                @Index(name = "idx_spirit_variant_link_related", columnList = "related_spirit_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class SpiritVariantLink extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 정규화 쌍의 작은 술 ID */
    @Column(name = "spirit_id", nullable = false)
    private Long spiritId;

    /** 정규화 쌍의 큰 술 ID */
    @Column(name = "related_spirit_id", nullable = false)
    private Long relatedSpiritId;

    @Enumerated(EnumType.STRING)
    @Column(name = "link_type", nullable = false, length = 20)
    private VariantLinkType linkType;

    public void changeType(VariantLinkType linkType) {
        this.linkType = linkType;
    }

    /** a, b 를 정규화(작은 값 = spiritId)해 새 링크 생성 */
    public static SpiritVariantLink of(Long a, Long b, VariantLinkType linkType) {
        long min = Math.min(a, b);
        long max = Math.max(a, b);
        return SpiritVariantLink.builder()
                .spiritId(min)
                .relatedSpiritId(max)
                .linkType(linkType)
                .build();
    }

    /** 이 링크에서 기준 술(id)의 상대편 술 ID 반환 */
    public Long partnerOf(Long id) {
        return spiritId.equals(id) ? relatedSpiritId : spiritId;
    }
}
