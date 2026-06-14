package com.caskbycask.domain.spirit.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "spirit_image",
        indexes = {
                @Index(name = "idx_spirit_image_spirit_id", columnList = "spirit_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류 이미지")
public class SpiritImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @Column(nullable = false, length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    @Comment("대표 이미지 여부")
    private Boolean isPrimary = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    public void markAsPrimary() {
        this.isPrimary = true;
    }

    public void unmarkAsPrimary() {
        this.isPrimary = false;
    }

    public void updateSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
