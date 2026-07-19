package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "posts",
        indexes = {
                @Index(name = "idx_post_board_type", columnList = "board_type"),
                @Index(name = "idx_post_status",     columnList = "status"),
                // 게시판별 공지(고정글) 상단 정렬용
                @Index(name = "idx_post_board_pinned", columnList = "board_type, is_pinned")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Post extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "board_type", nullable = false, length = 20)
    @Comment("게시판 유형 — FREE/NOTICE")
    private BoardType boardType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prefix_id")
    @Comment("말머리(post_prefixes.id)")
    private PostPrefix prefix;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @Comment("작성자(users.id)")
    private User author;

    @Builder.Default
    @Column(nullable = false)
    @Comment("익명 여부")
    private Boolean isAnonymous = false;

    @Column(nullable = false, length = 300)
    @Comment("제목")
    private String title;

    // [보안] XSS: 원본 HTML. DB 저장 전용, API 응답 절대 미노출.
    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(원본)")
    private String content;

    // [보안] XSS: jsoup Sanitize 완료본. API 응답은 이 필드만 사용.
    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(XSS 필터링)")
    private String contentSanitized;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    @Comment("상태 — ACTIVE/LOCKED/DELETED")
    private PostStatus status = PostStatus.ACTIVE;

    @Builder.Default
    @Column(nullable = false)
    @Comment("조회 수")
    private Long viewCount = 0L;

    @Builder.Default
    @Column(nullable = false)
    @Comment("좋아요 수")
    private Integer likeCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("댓글 수")
    private Integer commentCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("신고 수")
    private Integer reportCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("숨김 여부")
    private Boolean isHidden = false;

    // 게시판별 공지(고정글) 여부. 전체 공지사항(Notice)과 별개로, 작성된 게시판 안에서만 상단 고정.
    // 관리자/파트너만 설정 가능 (서비스 레이어에서 권한 검증).
    @Builder.Default
    @Column(nullable = false)
    @Comment("게시판 공지(상단 고정) 여부")
    private Boolean isPinned = false;

    // 성인 전용 글(주류 나눔 등). true면 작성·수정·열람에 성인인증 필요(서비스 레이어 검증) + 제목 19 아이콘.
    @Builder.Default
    @Column(nullable = false)
    @Comment("성인 전용 여부")
    private Boolean adultOnly = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    @Comment("시리즈(series.id)")
    private Series series;

    // [패치 9] 소식 게시판(NOTICE) 증류소 태그 — DISTILLERY(PARTNER) 작성 시 본인 담당 증류소, ADMIN은 임의/없음
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "distillery_tag_id")
    @Comment("증류소 태그(producer.id)")
    private Producer distilleryTag;

    @Comment("시리즈 내 순서")
    private Integer seriesOrder;

    @OneToOne(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Poll poll;

    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostImage> images = new ArrayList<>();

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "post_hashtags", joinColumns = @JoinColumn(name = "post_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "hashtag", nullable = false, length = 30)
    private List<String> hashtags = new ArrayList<>();

    public void incrementViewCount()    { this.viewCount++; }
    public void incrementLikeCount()    { this.likeCount++; }
    public void decrementLikeCount()    { if (this.likeCount > 0) this.likeCount--; }
    public void incrementCommentCount() { this.commentCount++; }
    public void decrementCommentCount() { if (this.commentCount > 0) this.commentCount--; }

    public void incrementReportCount() {
        this.reportCount++;
        // [패치 6] 하드코딩 5 → ReportConstants.POST_LOCK_THRESHOLD
        if (this.reportCount >= com.caskbycask.global.constants.ReportConstants.POST_LOCK_THRESHOLD) {
            this.status = PostStatus.LOCKED;
        }
    }

    public void markDeleted()   { this.status = PostStatus.DELETED; }
    public void unlock()        { this.status = PostStatus.ACTIVE; }
    public void hide()          { this.isHidden = true; }
    public void restore()       { this.isHidden = false; }
    public void changePinned(boolean pinned) { this.isPinned = pinned; }

    // 관리자 수동 신고 횟수 조정 (허위신고 정정 등). 상태(잠금)는 변경하지 않음 — 잠금/해제는 별도 버튼.
    public void updateReportCount(int count) { this.reportCount = Math.max(0, count); }

    public void update(String title, String content, String contentSanitized, PostPrefix prefix, boolean adultOnly) {
        this.title = title;
        this.content = content;
        this.contentSanitized = contentSanitized;
        this.prefix = prefix;
        this.adultOnly = adultOnly;
    }

    public void replaceHashtags(List<String> hashtags) {
        this.hashtags.clear();
        this.hashtags.addAll(hashtags);
    }

    public void assignToSeries(Series series, Integer order) {
        this.series = series;
        this.seriesOrder = order;
    }
}
