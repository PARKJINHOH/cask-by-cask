package com.caskbycask.domain.tierlist.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "tier_list_images",
        indexes = {
                @Index(name = "idx_tier_list_images_uploader", columnList = "uploaded_by_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "ux_tier_list_images_saved_file", columnNames = "saved_file_name")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("티어리스트 업로드 이미지")
public class TierListImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    @Comment("업로더(users.id)")
    private User uploadedBy;

    @Column(length = 255)
    @Comment("원본 파일명")
    private String originalFileName;

    @Column(nullable = false, length = 255)
    @Comment("저장 파일명")
    private String savedFileName;

    @Column(nullable = false)
    @Comment("파일 크기(byte)")
    private Long fileSize;

    @Column(nullable = false, length = 100)
    @Comment("MIME 타입")
    private String mimeType;

    @Column(nullable = false, length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    @Column(nullable = false, length = 200)
    @Comment("저장 하위 경로")
    private String subPath;
}
