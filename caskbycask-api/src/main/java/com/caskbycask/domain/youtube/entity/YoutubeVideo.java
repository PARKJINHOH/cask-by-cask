package com.caskbycask.domain.youtube.entity;

import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoSource;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 갤러리에 노출되는 유튜브 영상 한 편.
 * <p>
 * 저장하는 것은 <b>임베드와 목록 표시에 필요한 최소한</b>(영상 ID·제목·썸네일·게시일)뿐이다.
 * 조회수·재생시간은 Data API 없이 얻을 수 없고, 얻더라도 금세 낡아 화면에 거짓을 남기므로 담지 않는다.
 */
@Entity
@Table(
        name = "youtube_videos",
        uniqueConstraints = @UniqueConstraint(name = "ux_youtube_videos_key", columnNames = "video_key"),
        indexes = {
                @Index(name = "idx_youtube_videos_visible_published",
                        columnList = "is_visible, is_pinned, published_at, id"),
                @Index(name = "idx_youtube_videos_channel_published",
                        columnList = "channel_id, published_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("유튜브 갤러리 영상")
public class YoutubeVideo extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "channel_id", nullable = false)
    @Comment("채널(youtube_channels.id)")
    private YoutubeChannel channel;

    /** 유튜브 영상 ID. 임베드 주소와 상세 경로(/youtube/{videoKey})가 모두 이 값을 쓴다. */
    @Column(name = "video_key", nullable = false, length = 32)
    @Comment("유튜브 영상 ID")
    private String videoKey;

    @Column(nullable = false, length = 300)
    @Comment("영상 제목")
    private String title;

    @Column(length = 1000)
    @Comment("영상 설명 발췌")
    private String description;

    @Column(name = "thumbnail_url", length = 1000)
    @Comment("영상 썸네일 URL")
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_type", nullable = false, length = 20)
    @Comment("영상 유형 (VIDEO/SHORTS)")
    private YoutubeVideoType videoType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("유입 경로 (CHANNEL_FEED/MANUAL)")
    private YoutubeVideoSource source;

    @Column(name = "published_at", nullable = false)
    @Comment("유튜브 게시 일시")
    private LocalDateTime publishedAt;

    @Builder.Default
    @Column(name = "is_visible", nullable = false)
    @Comment("갤러리 노출 여부")
    private Boolean isVisible = true;

    @Builder.Default
    @Column(name = "is_pinned", nullable = false)
    @Comment("상단 고정 여부")
    private Boolean isPinned = false;

    @Column(name = "hidden_reason", length = 200)
    @Comment("숨김 사유(관리용)")
    private String hiddenReason;

    /**
     * 가용성 점검이 자동으로 숨긴 영상인지.
     * <p>관리자가 의도적으로 숨긴 영상을 점검이 되살리면 안 되므로 둘을 구분한다.
     */
    @Builder.Default
    @Column(name = "auto_hidden", nullable = false)
    @Comment("가용성 점검이 자동으로 숨겼는지")
    private Boolean autoHidden = false;

    @Column(name = "last_checked_at")
    @Comment("마지막 가용성 점검 일시")
    private LocalDateTime lastCheckedAt;

    @Builder.Default
    @OneToMany(mappedBy = "video", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<YoutubeVideoSpiritTag> spiritTags = new ArrayList<>();

    /**
     * 자동 수집이 다시 돌 때 덮어쓰는 항목.
     * <p>
     * {@code videoType} 은 일부러 제외한다 — 롱폼/숏츠 갈래 피드가 막히면 수집이 전부 VIDEO 로
     * 떨어지는데, 그때 관리자가 손으로 고쳐 둔 값을 매 수집마다 되돌리면 고칠 방법이 없어진다.
     */
    public void applyFeedUpdate(String title, String description, String thumbnailUrl,
                                LocalDateTime publishedAt) {
        this.title = title;
        this.description = description;
        this.thumbnailUrl = thumbnailUrl;
        this.publishedAt = publishedAt;
    }

    /**
     * 관리자가 직접 노출을 바꾼다.
     * <p>이 경로를 지나면 {@code autoHidden} 은 항상 꺼진다 — 관리자의 판단이 점검보다 우선이라,
     * 자동으로 숨겨진 영상을 관리자가 다시 켰다면 다음 점검이 또 내리면 안 된다.
     * (영상이 실제로 죽어 있다면 점검이 다시 자동 숨김으로 표시한다.)
     */
    public void updateVisibility(Boolean isVisible, String hiddenReason) {
        this.isVisible = Boolean.TRUE.equals(isVisible);
        this.hiddenReason = Boolean.TRUE.equals(isVisible) ? null : hiddenReason;
        this.autoHidden = false;
    }

    /** 유튜브에서 더 볼 수 없는 영상 — 점검이 자동으로 내린다. */
    public void markUnavailable(String reason, LocalDateTime checkedAt) {
        this.isVisible = false;
        this.autoHidden = true;
        this.hiddenReason = reason;
        this.lastCheckedAt = checkedAt;
    }

    /**
     * 자동으로 내렸던 영상이 되살아났을 때 원상 복구.
     * <p>관리자가 숨긴 영상({@code autoHidden = false})에는 쓰지 않는다 — 호출 측이 판단한다.
     */
    public void markAvailable(LocalDateTime checkedAt) {
        this.isVisible = true;
        this.autoHidden = false;
        this.hiddenReason = null;
        this.lastCheckedAt = checkedAt;
    }

    /** 상태 변화 없이 점검 시각만 남긴다. */
    public void markChecked(LocalDateTime checkedAt) {
        this.lastCheckedAt = checkedAt;
    }

    public void updatePinned(Boolean isPinned) {
        this.isPinned = Boolean.TRUE.equals(isPinned);
    }

    public void updateVideoType(YoutubeVideoType videoType) {
        this.videoType = videoType;
    }

    public void replaceSpiritTags(List<YoutubeVideoSpiritTag> tags) {
        this.spiritTags.clear();
        this.spiritTags.addAll(tags);
    }
}
