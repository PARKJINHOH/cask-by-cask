package com.caskbycask.domain.bottlecollection.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "user_bottle_image")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("보유 보틀 이미지")
public class UserBottleImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_bottle_id", nullable = false)
    @Comment("보유 보틀(user_bottle.id)")
    private UserBottle userBottle;

    @Column(name = "image_url", nullable = false, length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder;

    public void replaceImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
