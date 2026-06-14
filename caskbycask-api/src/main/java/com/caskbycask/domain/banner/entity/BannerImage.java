package com.caskbycask.domain.banner.entity;

import com.caskbycask.domain.banner.entity.enums.BannerImageType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("배너 이미지")
public class BannerImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    // nullable: 업로드 직후 배너 미저장 상태 허용 (고아 이미지)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "banner_id")
    @Comment("배너(banners.id)")
    private Banner banner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    @Comment("이미지 유형 — PC/MO(모바일)")
    private BannerImageType imageType;

    // [보안] 원본 파일명. DB에만 보존, 저장 경로 미사용.
    @Column(nullable = false, length = 255)
    @Comment("원본 파일명")
    private String originalFileName;

    // [보안] UUID 랜덤화. 원본명 노출 및 경로 추측 차단.
    @Column(nullable = false, length = 255)
    @Comment("저장 파일명")
    private String savedFileName;

    @Column(nullable = false, length = 100)
    @Comment("저장 하위 경로")
    private String subPath;

    @Column(nullable = false)
    @Comment("파일 크기(byte)")
    private Long fileSize;

    // [보안] Magic Bytes 검사로 확인된 실제 MIME 타입.
    @Column(nullable = false, length = 100)
    @Comment("MIME 타입")
    private String mimeType;

    @Column(nullable = false, length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 중 여부")
    private Boolean isUsed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    @Comment("업로더(users.id)")
    private User uploadedBy;

    public void linkToBanner(Banner banner) {
        this.banner = banner;
        this.isUsed = true;
    }

    public void markAsUnused() { this.isUsed = false; }
}
