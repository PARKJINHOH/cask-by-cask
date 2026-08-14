package com.caskbycask.domain.producer.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 생산자 로고 이미지 (최대 5장).
 * <p>
 * 포토카드에서 골라 쓸 수 있도록 여러 변형(가로형·세로형·배경색 다른 버전 등)을 등록해 둘 수 있다.
 * {@code sortOrder} 0번이 대표 — 주류 선택으로 로고가 자동 채워질 때 이 순서를 우선 후보로 쓴다.
 * {@code review_images} 와 같은 구조(정렬 가능한 자식 테이블)를 따른다.
 */
@Entity
@Table(name = "producer_logo_images",
        indexes = @Index(
                name = "idx_producer_logo_image_producer_order",
                columnList = "producer_id, sort_order, id"),
        uniqueConstraints = @UniqueConstraint(
                name = "uk_producer_logo_image_saved_file", columnNames = "saved_file_name"))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("생산자 로고 이미지")
public class ProducerLogoImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producer_id", nullable = false)
    private Producer producer;

    @Column(name = "saved_file_name", nullable = false, length = 255)
    private String savedFileName;

    @Column(name = "sub_path", nullable = false, length = 255)
    private String subPath;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    public void reorder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
