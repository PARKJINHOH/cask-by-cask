package com.caskbycask.domain.tastetree.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "taste_tree_bookmarks", uniqueConstraints = {
        @UniqueConstraint(name = "ux_taste_tree_bookmarks_tree_user", columnNames = {"tree_id", "user_id"})
}, indexes = {
        @Index(name = "idx_taste_tree_bookmarks_user", columnList = "user_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TasteTreeBookmark extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tree_id", nullable = false)
    private TasteTree tree;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
