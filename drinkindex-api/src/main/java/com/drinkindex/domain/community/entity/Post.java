package com.drinkindex.domain.community.entity;

import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.entity.enums.PostStatus;
import com.drinkindex.domain.producer.entity.Producer;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "posts",
        indexes = {
                @Index(name = "idx_post_board_type", columnList = "board_type"),
                @Index(name = "idx_post_status",     columnList = "status")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Post extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "board_type", nullable = false, length = 20)
    private BoardType boardType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prefix_id")
    private PostPrefix prefix;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isAnonymous = false;

    @Column(nullable = false, length = 300)
    private String title;

    // [보안] XSS: 원본 HTML. DB 저장 전용, API 응답 절대 미노출.
    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    // [보안] XSS: jsoup Sanitize 완료본. API 응답은 이 필드만 사용.
    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String contentSanitized;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PostStatus status = PostStatus.ACTIVE;

    @Builder.Default
    @Column(nullable = false)
    private Long viewCount = 0L;

    @Builder.Default
    @Column(nullable = false)
    private Integer likeCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer commentCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer reportCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isHidden = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    private Series series;

    // [패치 9] 소식 게시판(NOTICE) 증류소 태그 — DISTILLERY(PARTNER) 작성 시 본인 담당 증류소, ADMIN은 임의/없음
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "distillery_tag_id")
    private Producer distilleryTag;

    private Integer seriesOrder;

    @OneToOne(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Poll poll;

    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostImage> images = new ArrayList<>();

    public void incrementViewCount()    { this.viewCount++; }
    public void incrementLikeCount()    { this.likeCount++; }
    public void decrementLikeCount()    { if (this.likeCount > 0) this.likeCount--; }
    public void incrementCommentCount() { this.commentCount++; }
    public void decrementCommentCount() { if (this.commentCount > 0) this.commentCount--; }

    public void incrementReportCount() {
        this.reportCount++;
        // [패치 6] 하드코딩 5 → ReportConstants.POST_LOCK_THRESHOLD
        if (this.reportCount >= com.drinkindex.global.constants.ReportConstants.POST_LOCK_THRESHOLD) {
            this.status = PostStatus.LOCKED;
        }
    }

    public void markDeleted()   { this.status = PostStatus.DELETED; }
    public void unlock()        { this.status = PostStatus.ACTIVE; }
    public void hide()          { this.isHidden = true; }
    public void restore()       { this.isHidden = false; }

    public void update(String title, String content, String contentSanitized, PostPrefix prefix) {
        this.title = title;
        this.content = content;
        this.contentSanitized = contentSanitized;
        this.prefix = prefix;
    }

    public void assignToSeries(Series series, Integer order) {
        this.series = series;
        this.seriesOrder = order;
    }
}
