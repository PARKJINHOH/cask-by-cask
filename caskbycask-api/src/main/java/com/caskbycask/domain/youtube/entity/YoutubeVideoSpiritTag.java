package com.caskbycask.domain.youtube.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 영상에 붙는 주류 태그. {@code post_spirit_tags}(이미지 갤러리)와 같은 구조다.
 * <p>
 * 태그를 누르면 주류 상세로 가고, 주류 상세는 역방향으로 "이 술이 나온 영상"을 모아 보여 준다.
 * 갤러리와 주류 카탈로그를 잇는 내부 링크라 검색 노출에도 그대로 쓰인다.
 */
@Entity
@Table(
        name = "youtube_video_spirit_tags",
        uniqueConstraints = @UniqueConstraint(
                name = "ux_youtube_video_spirit_tags", columnNames = {"youtube_video_id", "spirit_id"}),
        indexes = @Index(name = "idx_youtube_video_spirit_tags_by_spirit",
                columnList = "spirit_id, youtube_video_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("유튜브 영상 주류 태그")
public class YoutubeVideoSpiritTag extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "youtube_video_id", nullable = false)
    @Comment("영상(youtube_videos.id)")
    private YoutubeVideo video;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "spirit_id", nullable = false)
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;
}
