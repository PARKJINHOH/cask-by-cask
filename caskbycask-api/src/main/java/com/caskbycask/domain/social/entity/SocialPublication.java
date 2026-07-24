package com.caskbycask.domain.social.entity;

import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "social_publications",
        uniqueConstraints = @UniqueConstraint(name = "uk_social_publication_bundle_platform",
                columnNames = {"bundle_id", "platform"}))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SocialPublication extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bundle_id", nullable = false)
    private SocialPublishBundle bundle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialPlatform platform;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SocialPublicationStatus status;

    @Column(length = 255)
    private String containerId;

    @Column(length = 255)
    private String externalMediaId;

    @Column(length = 1000)
    private String permalink;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String captionSnapshot;

    @Column(length = 1000)
    private String imageUrlSnapshot;

    @Builder.Default
    @Column(nullable = false)
    private int attemptCount = 0;

    private LocalDateTime nextAttemptAt;
    private LocalDateTime lastAttemptAt;
    private LocalDateTime publishedAt;

    @Column(length = 100)
    private String lastErrorCode;

    @Column(length = 1000)
    private String lastErrorMessage;

    @Version
    private long version;

    public void queue() {
        this.status = SocialPublicationStatus.QUEUED;
        this.nextAttemptAt = LocalDateTime.now();
        clearError();
    }

    public void beginAttempt(String caption, String imageUrl) {
        this.status = SocialPublicationStatus.RENDERING;
        this.captionSnapshot = caption;
        this.imageUrlSnapshot = imageUrl;
        this.attemptCount++;
        this.lastAttemptAt = LocalDateTime.now();
        this.nextAttemptAt = null;
        this.containerId = null;
        this.externalMediaId = null;
        clearError();
    }

    public void setSnapshot(String caption, String imageUrl) {
        this.captionSnapshot = caption;
        this.imageUrlSnapshot = imageUrl;
    }

    public void containerCreated(String containerId) {
        this.containerId = containerId;
        this.status = SocialPublicationStatus.CONTAINER_CREATED;
    }

    public void publishing() {
        this.status = SocialPublicationStatus.PUBLISHING;
    }

    public void verifying(String code, String message) {
        this.status = SocialPublicationStatus.VERIFYING;
        this.lastErrorCode = code;
        this.lastErrorMessage = truncate(message);
        this.nextAttemptAt = LocalDateTime.now().plusMinutes(5);
    }

    public void published(String mediaId, String permalink) {
        this.externalMediaId = mediaId;
        this.permalink = permalink;
        this.status = SocialPublicationStatus.PUBLISHED;
        this.publishedAt = LocalDateTime.now();
        this.nextAttemptAt = null;
        clearError();
    }

    public void awaitingPermalink(String mediaId, String code, String message) {
        this.externalMediaId = mediaId;
        this.status = SocialPublicationStatus.VERIFYING;
        this.lastErrorCode = code;
        this.lastErrorMessage = truncate(message);
        this.nextAttemptAt = LocalDateTime.now().plusMinutes(5);
    }

    public void publishedWithoutPermalink(String code, String message) {
        this.status = SocialPublicationStatus.PUBLISHED;
        this.publishedAt = LocalDateTime.now();
        this.nextAttemptAt = null;
        this.lastErrorCode = code;
        this.lastErrorMessage = truncate(message);
    }

    public void retryAt(LocalDateTime at, String code, String message) {
        this.status = SocialPublicationStatus.RETRY_WAIT;
        this.nextAttemptAt = at;
        this.lastErrorCode = code;
        this.lastErrorMessage = truncate(message);
    }

    public void fail(String code, String message) {
        this.status = SocialPublicationStatus.FAILED;
        this.nextAttemptAt = null;
        this.lastErrorCode = code;
        this.lastErrorMessage = truncate(message);
    }

    public void cancel() {
        this.status = SocialPublicationStatus.CANCELED;
        this.nextAttemptAt = null;
    }

    public void markExternallyDeleted() {
        this.status = SocialPublicationStatus.EXTERNALLY_DELETED;
        this.nextAttemptAt = null;
    }

    public void recoverAfterWorkerInterruption() {
        if (status == SocialPublicationStatus.PUBLISHING) {
            verifying("WORKER_INTERRUPTED", "Publishing was interrupted; verifying the provider result.");
            return;
        }
        if (status == SocialPublicationStatus.RENDERING
                || status == SocialPublicationStatus.CONTAINER_CREATED) {
            retryAt(LocalDateTime.now(), "WORKER_INTERRUPTED",
                    "Publishing was interrupted and will be retried.");
        }
    }

    public boolean canRetry() {
        return status == SocialPublicationStatus.FAILED;
    }

    public void manualRetry() {
        if (!canRetry()) throw new IllegalStateException("Only failed SNS publications can be retried.");
        this.attemptCount = 0;
        this.containerId = null;
        this.externalMediaId = null;
        this.permalink = null;
        this.captionSnapshot = null;
        this.imageUrlSnapshot = null;
        queue();
    }

    private void clearError() {
        this.lastErrorCode = null;
        this.lastErrorMessage = null;
    }

    private static String truncate(String value) {
        if (value == null || value.length() <= 1000) return value;
        return value.substring(0, 1000);
    }
}
