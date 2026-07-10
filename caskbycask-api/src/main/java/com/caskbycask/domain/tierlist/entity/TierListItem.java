package com.caskbycask.domain.tierlist.entity;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.tierlist.entity.enums.TierListItemType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "tier_list_items",
        indexes = {
                @Index(name = "idx_tier_list_items_list_sort", columnList = "tier_list_id, sort_order"),
                @Index(name = "idx_tier_list_items_row_sort", columnList = "tier_row_id, sort_order"),
                @Index(name = "idx_tier_list_items_spirit", columnList = "spirit_id"),
                @Index(name = "idx_tier_list_items_producer", columnList = "producer_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("티어리스트 아이템")
public class TierListItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tier_list_id", nullable = false)
    @Comment("티어리스트(tier_lists.id)")
    private TierList tierList;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tier_row_id")
    @Comment("배치된 티어 행(tier_list_rows.id), null이면 후보 영역")
    private TierListRow row;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    @Comment("대상 유형")
    private TierListItemType itemType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producer_id")
    @Comment("생산자(producer.id)")
    private Producer producer;

    @Column(nullable = false, length = 200)
    @Comment("표시명")
    private String displayName;

    @Column(length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    @Column(nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder;
}
