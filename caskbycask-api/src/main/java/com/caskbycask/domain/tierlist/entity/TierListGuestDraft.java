package com.caskbycask.domain.tierlist.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tier_list_guest_drafts",
        indexes = @Index(name = "idx_tier_list_guest_drafts_expires", columnList = "expires_at"),
        uniqueConstraints = @UniqueConstraint(name = "ux_tier_list_guest_drafts_token", columnNames = "token_hash"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TierListGuestDraft extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Lob
    @Column(name = "content_json", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String contentJson;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public void update(String contentJson, LocalDateTime expiresAt) {
        this.contentJson = contentJson;
        this.expiresAt = expiresAt;
    }

    public void extend(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }
}
