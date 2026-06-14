package com.caskbycask.domain.user.entity;

import com.caskbycask.domain.user.entity.enums.SocialProvider;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

/**
 * 사용자 ↔ 소셜 제공자 연동 매핑.
 *
 * 한 계정에 여러 제공자를 붙일 수 있고(이메일 로그인과도 병행), 매핑 기준은
 * (provider, providerUserId) UNIQUE 다. 이메일은 보조 스냅샷일 뿐 식별자가 아니다.
 *
 * providerRefreshTokenEnc 는 제공자가 발급한 refresh token 을 AES-GCM 으로 암호화해 보관하며,
 * 탈퇴/연동해제 시 access token 을 재발급해 네이버 grant_type=delete / 구글 revoke 를 호출하는 데 쓴다.
 */
@Entity
@Table(
        name = "user_social_account",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_social_provider", columnNames = {"provider", "provider_user_id"})
        },
        indexes = {
                @Index(name = "idx_user_social_user", columnList = "user_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("사용자 소셜 연동")
public class UserSocialAccount extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("소셜 제공자 — NAVER/GOOGLE")
    private SocialProvider provider;

    /** 제공자 고유 식별자 — 네이버 id / 구글 sub. 이메일 변경과 무관하게 계정을 식별한다. */
    @Column(name = "provider_user_id", nullable = false, length = 255)
    @Comment("제공자 고유 식별자")
    private String providerUserId;

    /** 연동 시점의 제공자 이메일 스냅샷 (없을 수 있음). 식별자가 아닌 참고용. */
    @Column(length = 255)
    @Comment("제공자 이메일 스냅샷")
    private String email;

    /** 제공자 refresh token (AES-GCM 암호화). 탈퇴/연동해제 시 연결해지 호출용. */
    @Lob
    @Column(name = "provider_refresh_token_enc", columnDefinition = "TEXT")
    @Comment("제공자 refresh token(암호화)")
    private String providerRefreshTokenEnc;

    @Column(nullable = false)
    @Comment("연동 일시")
    private LocalDateTime linkedAt;

    public void updateRefreshToken(String providerRefreshTokenEnc) {
        if (providerRefreshTokenEnc != null) {
            this.providerRefreshTokenEnc = providerRefreshTokenEnc;
        }
    }

    public void updateEmail(String email) {
        this.email = email;
    }
}
