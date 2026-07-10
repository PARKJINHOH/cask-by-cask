package com.caskbycask.domain.tierlist.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "tier_list_rows",
        indexes = {
                @Index(name = "idx_tier_list_rows_list_sort", columnList = "tier_list_id, sort_order")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("티어리스트 행")
public class TierListRow extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tier_list_id", nullable = false)
    @Comment("티어리스트(tier_lists.id)")
    private TierList tierList;

    @Column(nullable = false, length = 50)
    @Comment("티어명")
    private String label;

    @Column(nullable = false, length = 20)
    @Comment("색상")
    private String color;

    @Column(nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder;
}
