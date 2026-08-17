package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 게시글에 붙는 주류 태그.
 * <p>
 * 출처가 둘이다.
 * <ul>
 *   <li>이미지 갤러리(PHOTO) 업로드 화면에서 고른 주류 — 태그를 누르면 주류 상세로 이동하고,
 *       주류 상세에서는 역방향으로 "이 술의 사진"을 모아 본다.</li>
 *   <li>본문 리치텍스트의 주류 카드 임베드({@code data-spirit-id}) — 게시판을 가리지 않는다.
 *       HTML 문자열 안이라 DB 로는 역조회할 수 없으므로,
 *       {@code PostService.applySpiritTags} 가 저장 시점에 파싱해 이 표로 옮겨 둔다.</li>
 * </ul>
 */
@Entity
@Table(
        name = "post_spirit_tags",
        uniqueConstraints = @UniqueConstraint(
                name = "ux_post_spirit_tags_post_spirit", columnNames = {"post_id", "spirit_id"}),
        indexes = {
                @Index(name = "idx_post_spirit_tags_by_spirit", columnList = "spirit_id, post_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("게시글 주류 태그")
public class PostSpiritTag extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    @Comment("게시글(posts.id)")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "spirit_id", nullable = false)
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder;
}
