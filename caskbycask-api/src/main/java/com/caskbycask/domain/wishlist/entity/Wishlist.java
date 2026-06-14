package com.caskbycask.domain.wishlist.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.wishlist.entity.enums.WishlistType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "wishlist",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_wishlist_user_spirit_type", columnNames = {"user_id", "spirit_id", "type"})
        },
        indexes = {
                @Index(name = "idx_wishlist_user_id", columnList = "user_id"),
                @Index(name = "idx_wishlist_spirit_id", columnList = "spirit_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("위시리스트")
public class Wishlist extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("유형 — COLLECTION")
    private WishlistType type;
}
