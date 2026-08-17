package com.caskbycask.domain.youtube.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

/**
 * 유튜브 갤러리에 등록된 채널.
 * <p>
 * 관리자가 채널 주소를 붙여 넣어 등록하고, 이후 그 채널의 새 영상은 자동으로 갤러리에 들어온다.
 * 외부 창작자의 저작물을 우리 화면에 싣는 기능이므로 <b>게재 허락을 확인해야 노출된다</b> —
 * {@link #permissionConfirmed} 가 false 인 채널은 {@link #isVisible} 과 무관하게 공개 목록에서 빠진다
 * (판정은 {@link #isPubliclyVisible()} 한 곳에서만 한다).
 */
@Entity
@Table(
        name = "youtube_channels",
        uniqueConstraints = @UniqueConstraint(name = "ux_youtube_channels_key", columnNames = "channel_key"),
        indexes = @Index(name = "idx_youtube_channels_visible_order",
                columnList = "is_visible, sort_order, id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("유튜브 갤러리 채널")
public class YoutubeChannel extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    /** 유튜브 채널 ID. 핸들은 바뀔 수 있어도 이 값은 고정이라 이쪽을 식별자로 쓴다. */
    @Column(name = "channel_key", nullable = false, length = 64)
    @Comment("유튜브 채널 ID (UC...)")
    private String channelKey;

    @Column(length = 100)
    @Comment("채널 핸들 (@ 제외)")
    private String handle;

    @Column(nullable = false, length = 200)
    @Comment("채널명")
    private String title;

    @Column(length = 500)
    @Comment("채널 소개 (한국어)")
    private String description;

    @Column(name = "description_en", length = 500)
    @Comment("채널 소개 (영어)")
    private String descriptionEn;

    @Column(name = "thumbnail_url", length = 1000)
    @Comment("채널 프로필 이미지 URL")
    private String thumbnailUrl;

    @Column(name = "channel_url", nullable = false, length = 500)
    @Comment("채널 홈 URL")
    private String channelUrl;

    @Builder.Default
    @Column(name = "is_visible", nullable = false)
    @Comment("갤러리 노출 여부")
    private Boolean isVisible = false;

    @Builder.Default
    @Column(name = "sync_enabled", nullable = false)
    @Comment("최신 영상 자동 수집 여부")
    private Boolean syncEnabled = true;

    @Builder.Default
    @Column(name = "permission_confirmed", nullable = false)
    @Comment("채널 운영자 게재 허락 확인 여부")
    private Boolean permissionConfirmed = false;

    @Column(name = "permission_note", length = 500)
    @Comment("허락 확인 근거 메모 (일자·경로)")
    private String permissionNote;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    @Column(name = "last_synced_at")
    @Comment("마지막 수집 성공 일시")
    private LocalDateTime lastSyncedAt;

    @Column(name = "last_sync_error", length = 500)
    @Comment("마지막 수집 실패 사유")
    private String lastSyncError;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    @Comment("등록 관리자(users.id)")
    private User createdBy;

    /** 공개 목록·상세에 나갈 수 있는 채널인지. 허락 확인이 노출의 전제다. */
    public boolean isPubliclyVisible() {
        return Boolean.TRUE.equals(isVisible) && Boolean.TRUE.equals(permissionConfirmed);
    }

    public void updateProfile(String title, String handle, String description, String descriptionEn,
                              String thumbnailUrl, String channelUrl) {
        this.title = title;
        this.handle = handle;
        this.description = description;
        this.descriptionEn = descriptionEn;
        this.thumbnailUrl = thumbnailUrl;
        this.channelUrl = channelUrl;
    }

    public void updateExposure(Boolean isVisible, Boolean syncEnabled,
                               Boolean permissionConfirmed, String permissionNote) {
        this.isVisible = Boolean.TRUE.equals(isVisible);
        this.syncEnabled = Boolean.TRUE.equals(syncEnabled);
        this.permissionConfirmed = Boolean.TRUE.equals(permissionConfirmed);
        this.permissionNote = permissionNote;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    /** 수집이 한 번이라도 성공하면 직전 실패 사유는 지운다 — 화면에 낡은 경고가 남지 않게. */
    public void markSynced(LocalDateTime syncedAt) {
        this.lastSyncedAt = syncedAt;
        this.lastSyncError = null;
    }

    public void markSyncFailed(String reason) {
        this.lastSyncError = reason == null || reason.length() <= 500
                ? reason
                : reason.substring(0, 500);
    }
}
