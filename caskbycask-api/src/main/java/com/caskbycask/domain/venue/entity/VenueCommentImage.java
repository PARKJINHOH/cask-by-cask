package com.caskbycask.domain.venue.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 장소 댓글 사진.
 *
 * <p>업로드 시 전부 WebP 로 재인코딩되며 <b>원본은 남기지 않는다</b>. 용량 때문이 아니라
 * EXIF 때문이다 — 바 사진에는 촬영 위치가 박혀 있어 원본을 그대로 서빙하면 사용자의
 * 이동 이력이 새어 나간다. 나중에 "원본 보관으로 최적화"하려는 시도를 막기 위해 여기 적어 둔다.
 */
@Entity
@Table(
        name = "venue_comment_images",
        indexes = @Index(
                name = "idx_venue_comment_image_comment", columnList = "venue_comment_id, sort_order"),
        uniqueConstraints = @UniqueConstraint(
                name = "uq_venue_comment_image_file", columnNames = "saved_file_name")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("장소 댓글 이미지")
public class VenueCommentImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_comment_id", nullable = false)
    @Comment("댓글(venue_comments.id)")
    private VenueComment comment;

    @Column(name = "saved_file_name", nullable = false, length = 255)
    @Comment("저장 파일명(UUID.webp)")
    private String savedFileName;

    @Column(name = "sub_path", nullable = false, length = 100)
    @Comment("저장 하위 경로(venues/yyyyMM)")
    private String subPath;

    @Column(name = "mime_type", nullable = false, length = 50)
    @Comment("MIME 타입")
    private String mimeType;

    @Column(name = "image_url", nullable = false, length = 500)
    @Comment("서빙 URL")
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    @Comment("노출 순서(0부터)")
    private Integer sortOrder;

    public void reorder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void bindTo(VenueComment comment, int sortOrder) {
        this.comment = comment;
        this.sortOrder = sortOrder;
    }
}
