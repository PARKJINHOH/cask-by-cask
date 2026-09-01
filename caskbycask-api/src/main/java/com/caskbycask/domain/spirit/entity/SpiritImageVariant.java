package com.caskbycask.domain.spirit.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 이미지 ↔ 에디션 지정 — 이미지 1장이 여러 에디션에 쓰일 수 있다.
 *
 * <p>여러 에디션이 같은 라벨 디자인을 쓰는 일이 흔해, 에디션마다 같은 파일을 올리면 중복이 쌓인다.
 * 이미지는 마스터에 한 번만 올리고 이 표로 "어느 에디션에 쓰이는지"를 연결한다.
 *
 * <p>{@link SpiritVariantLink} 와 같이 연관 엔티티 매핑 없이 ID 두 개만 들고 있다 —
 * 목록 조회가 대부분이라 프록시를 만들 이유가 없다.
 */
@Entity
@Table(
        name = "spirit_image_variant",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_spirit_image_variant",
                columnNames = {"spirit_image_id", "spirit_id"}
        ),
        indexes = {
                @Index(name = "idx_spirit_image_variant_image", columnList = "spirit_image_id"),
                @Index(name = "idx_spirit_image_variant_spirit", columnList = "spirit_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@Comment("이미지-에디션 지정")
public class SpiritImageVariant extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(name = "spirit_image_id", nullable = false)
    @Comment("이미지(spirit_image.id)")
    private Long spiritImageId;

    @Column(name = "spirit_id", nullable = false)
    @Comment("이 이미지를 쓰는 에디션(spirit.id)")
    private Long spiritId;

    public static SpiritImageVariant of(Long spiritImageId, Long spiritId) {
        return SpiritImageVariant.builder()
                .spiritImageId(spiritImageId)
                .spiritId(spiritId)
                .build();
    }
}
