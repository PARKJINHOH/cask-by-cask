package com.drinkindex.domain.banner.entity;

import com.drinkindex.domain.banner.entity.enums.BannerImageType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "banner_images",
        indexes = {
                @Index(name = "idx_banner_image_banner_id",      columnList = "banner_id"),
                @Index(name = "idx_banner_image_is_used",        columnList = "is_used"),
                @Index(name = "idx_banner_image_uploaded_by_id", columnList = "uploaded_by_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class BannerImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // nullable: 업로드 직후 배너 미저장 상태 허용 (고아 이미지)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "banner_id")
    private Banner banner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private BannerImageType imageType;

    // [보안] 원본 파일명. DB에만 보존, 저장 경로 미사용.
    @Column(nullable = false, length = 255)
    private String originalFileName;

    // [보안] UUID 랜덤화. 원본명 노출 및 경로 추측 차단.
    @Column(nullable = false, length = 255)
    private String savedFileName;

    @Column(nullable = false, length = 100)
    private String subPath;

    @Column(nullable = false)
    private Long fileSize;

    // [보안] Magic Bytes 검사로 확인된 실제 MIME 타입.
    @Column(nullable = false, length = 100)
    private String mimeType;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isUsed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    private User uploadedBy;

    public void linkToBanner(Banner banner) {
        this.banner = banner;
        this.isUsed = true;
    }

    public void markAsUnused() { this.isUsed = false; }
}
