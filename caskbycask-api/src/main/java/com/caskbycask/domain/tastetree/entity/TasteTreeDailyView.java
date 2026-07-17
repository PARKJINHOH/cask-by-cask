package com.caskbycask.domain.tastetree.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "taste_tree_daily_views", uniqueConstraints =
        @UniqueConstraint(name = "ux_taste_tree_daily_views", columnNames = {"tree_id", "viewer_key_hash", "viewed_date"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TasteTreeDailyView extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tree_id", nullable = false)
    private TasteTree tree;

    @Column(name = "viewer_key_hash", nullable = false, length = 64)
    private String viewerKeyHash;

    @Column(name = "viewed_date", nullable = false)
    private LocalDate viewedDate;
}
