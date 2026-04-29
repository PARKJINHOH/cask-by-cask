package com.drinkindex.domain.spirit.entity;

import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

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
public class SpiritImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    private Spirit spirit;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isPrimary = false;

    @Builder.Default
    @Column(nullable = false)
    private Integer sortOrder = 0;

    public void markAsPrimary() {
        this.isPrimary = true;
    }

    public void unmarkAsPrimary() {
        this.isPrimary = false;
    }
}
