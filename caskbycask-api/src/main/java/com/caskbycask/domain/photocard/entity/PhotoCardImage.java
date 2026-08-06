package com.caskbycask.domain.photocard.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 포토카드 이미지(템플릿 미리보기 · 이미지 레이어).
 * <p>
 * 저장 URL 이 {@code /api/photo-cards/images/{파일명}} 이라 연월 디렉토리가 경로에 없다.
 * 파일명으로 실제 저장 경로를 복원하려면 이 표가 필요하다(taste_tree_images 와 같은 이유).
 */
@Entity
@Table(name = "photo_card_images",
        uniqueConstraints = @UniqueConstraint(
                name = "ux_photo_card_images_file", columnNames = "saved_file_name"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("포토카드 이미지")
public class PhotoCardImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(name = "saved_file_name", nullable = false, length = 255)
    @Comment("저장 파일명")
    private String savedFileName;

    @Column(name = "sub_path", nullable = false, length = 200)
    @Comment("저장 하위 경로")
    private String subPath;

    @Column(name = "mime_type", nullable = false, length = 100)
    @Comment("MIME 타입")
    private String mimeType;

    @Column(name = "image_url", nullable = false, length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    @Column(name = "original_file_name", nullable = false, length = 255)
    @Comment("원본 파일명")
    private String originalFileName;

    @Column(name = "file_size", nullable = false)
    @Comment("파일 크기(byte)")
    private Long fileSize;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id")
    @Comment("업로더(users.id)")
    private User uploadedBy;
}
