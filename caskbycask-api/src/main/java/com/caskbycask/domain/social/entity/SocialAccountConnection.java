package com.caskbycask.domain.social.entity;

import com.caskbycask.domain.social.entity.enums.SocialConnectionStatus;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "social_account_connections",
        uniqueConstraints = @UniqueConstraint(name = "uk_social_connection_platform", columnNames = "platform"))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SocialAccountConnection extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialPlatform platform;

    @Column(nullable = false, length = 255)
    private String externalUserId;

    @Column(length = 255)
    private String username;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String encryptedAccessToken;

    @Column(nullable = false)
    private LocalDateTime tokenExpiresAt;

    @Column(nullable = false, length = 1000)
    private String grantedScopes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SocialConnectionStatus status;

    private LocalDateTime lastVerifiedAt;
    private LocalDateTime lastRefreshedAt;

    @Column(length = 1000)
    private String lastError;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "connected_by_id", nullable = false)
    private User connectedBy;

    public void reconnect(String externalUserId, String username, String encryptedAccessToken,
                          LocalDateTime expiresAt, String scopes, User actor) {
        this.externalUserId = externalUserId;
        this.username = username;
        this.encryptedAccessToken = encryptedAccessToken;
        this.tokenExpiresAt = expiresAt;
        this.grantedScopes = scopes;
        this.connectedBy = actor;
        this.status = SocialConnectionStatus.CONNECTED;
        this.lastVerifiedAt = LocalDateTime.now();
        this.lastRefreshedAt = LocalDateTime.now();
        this.lastError = null;
    }

    public void refreshed(String encryptedToken, LocalDateTime expiresAt) {
        this.encryptedAccessToken = encryptedToken;
        this.tokenExpiresAt = expiresAt;
        this.status = SocialConnectionStatus.CONNECTED;
        this.lastRefreshedAt = LocalDateTime.now();
        this.lastError = null;
    }

    public void verified(String username) {
        this.username = username;
        this.status = SocialConnectionStatus.CONNECTED;
        this.lastVerifiedAt = LocalDateTime.now();
        this.lastError = null;
    }

    public void markStatus(SocialConnectionStatus status, String error) {
        this.status = status;
        this.lastError = error == null || error.length() <= 1000 ? error : error.substring(0, 1000);
    }
}
