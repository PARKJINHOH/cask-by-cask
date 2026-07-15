package com.caskbycask.domain.tastetree.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "taste_tree_results", indexes = {
        @Index(name = "idx_taste_tree_results_user", columnList = "user_id, created_at"),
        @Index(name = "idx_taste_tree_results_tree_version", columnList = "tree_id, tree_version_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "ux_taste_tree_results_share_key", columnNames = "share_key")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TasteTreeResult extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tree_id", nullable = false)
    private TasteTree tree;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tree_version_id", nullable = false)
    private TasteTreeVersion version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "share_key", nullable = false, length = 64)
    private String shareKey;

    @Lob
    @Column(name = "path_json", nullable = false, columnDefinition = "LONGTEXT")
    private String pathJson;

    @Lob
    @Column(name = "items_json", nullable = false, columnDefinition = "LONGTEXT")
    private String itemsJson;
}
