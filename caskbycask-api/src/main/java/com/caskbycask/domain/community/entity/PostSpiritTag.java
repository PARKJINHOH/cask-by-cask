package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 게시글에 붙는 주류 태그.
 * <p>
 * 이미지 갤러리(PHOTO) 글에서 쓴다 — 포토카드를 만들 때 고른 주류가 그대로 태그가 되고,
 * 태그를 누르면 주류 상세로 이동한다. 주류 상세에서는 역방향으로 "이 술의 사진"을 모아 본다.
 * <p>
 * 본문 리치텍스트의 주류 카드 임베드({@code data-spirit-id})는 HTML 문자열 안이라
 * DB 로 역조회할 수 없어서 재사용하지 못한다.
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
