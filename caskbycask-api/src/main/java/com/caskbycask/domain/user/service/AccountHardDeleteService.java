package com.caskbycask.domain.user.service;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.UserSocialAccount;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.entity.enums.SocialProvider;
import com.caskbycask.domain.user.policy.AccountPolicy;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.user.repository.UserSocialAccountRepository;
import com.caskbycask.global.auth.jwt.RefreshTokenRepository;
import com.caskbycask.global.auth.oauth.OAuthClientRegistry;
import com.caskbycask.global.auth.oauth.OAuthTokenCipher;
import com.caskbycask.global.storage.FileStorageService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 계정 영구 삭제(개인정보 파기) 서비스.
 *
 * 게시글·리뷰·댓글·쪽지·알림은 공용 "탈퇴한사용자" 센티넬 계정으로 재귀속하여 보존하고
 * (상대방 대화/알림 유지), 그 외 개인 데이터(위시리스트·추천·신고·출석·점수·보틀·임시저장·
 * 차단·등록요청 등)는 물리 삭제한 뒤, 마지막으로 users 행 자체를 물리 삭제한다.
 *
 * users 를 NOT NULL 외래키로 참조하는 모든 테이블을 FK 의존성 순서대로 정리한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountHardDeleteService {

    /** 보존 콘텐츠가 재귀속되는 공용 센티넬 계정 식별자 */
    private static final String SENTINEL_EMAIL = AccountPolicy.SENTINEL_EMAIL;
    private static final String SENTINEL_NICKNAME = AccountPolicy.SENTINEL_NICKNAME;
    private static final String PROFILE_SUB_PATH = "profiles";

    @PersistenceContext
    private EntityManager em;

    private final UserRepository userRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final OAuthClientRegistry oAuthClientRegistry;
    private final OAuthTokenCipher oAuthTokenCipher;

    @Transactional
    public void hardDelete(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        String profileImageUrl = user.getProfileImageUrl();
        Long sentinelId = getOrCreateSentinelId();

        // 제공자(네이버·구글) 연결 해지 — 영속성 컨텍스트 정리 전에 토큰을 추출해 best-effort 호출.
        // (네이버 grant_type=delete / 구글 revoke. 실패해도 탈퇴는 계속 진행)
        revokeSocialConnections(userId);

        // 영속성 컨텍스트의 관리 엔티티(target/sentinel)를 분리 — 이후 네이티브 DML과 충돌 방지
        em.flush();
        em.clear();

        // ── 1) 보존 콘텐츠 작성자를 센티넬로 재귀속 ──────────────────────────
        reassign("UPDATE posts SET author_id = :s WHERE author_id = :uid", userId, sentinelId);
        reassign("UPDATE review SET user_id = :s WHERE user_id = :uid", userId, sentinelId);
        reassign("UPDATE post_comments SET author_id = :s WHERE author_id = :uid", userId, sentinelId);
        reassign("UPDATE community_comment SET user_id = :s WHERE user_id = :uid", userId, sentinelId);
        reassign("UPDATE series SET author_id = :s WHERE author_id = :uid", userId, sentinelId);
        reassign("UPDATE post_images SET uploaded_by_id = :s WHERE uploaded_by_id = :uid", userId, sentinelId);
        // 관리자/파트너 콘텐츠(있을 경우 보존)
        reassign("UPDATE banners SET created_by_id = :s WHERE created_by_id = :uid", userId, sentinelId);
        reassign("UPDATE banner_images SET uploaded_by_id = :s WHERE uploaded_by_id = :uid", userId, sentinelId);
        reassign("UPDATE notice SET author_id = :s WHERE author_id = :uid", userId, sentinelId);
        reassign("UPDATE notice_image SET uploaded_by_id = :s WHERE uploaded_by_id = :uid", userId, sentinelId);
        reassign("UPDATE popups SET created_by_id = :s WHERE created_by_id = :uid", userId, sentinelId);
        reassign("UPDATE popup_images SET uploaded_by_id = :s WHERE uploaded_by_id = :uid", userId, sentinelId);
        reassign("UPDATE admin_logs SET actor_id = :s WHERE actor_id = :uid", userId, sentinelId);
        // 쪽지·알림은 파기하지 않고 센티넬로 재귀속 보존 (상대방 대화/알림 유지, 작성자는 '탈퇴한사용자'로 표시)
        reassign("UPDATE messages SET sender_id = :s WHERE sender_id = :uid", userId, sentinelId);
        reassign("UPDATE messages SET receiver_id = :s WHERE receiver_id = :uid", userId, sentinelId);
        reassign("UPDATE message_items SET sender_id = :s WHERE sender_id = :uid", userId, sentinelId);
        reassign("UPDATE notifications SET recipient_id = :s WHERE recipient_id = :uid", userId, sentinelId);

        // ── 2) Nullable FK 는 NULL 처리 (대상 콘텐츠 보존) ───────────────────
        exec("UPDATE legal_documents SET author_id = NULL WHERE author_id = :uid", userId);
        exec("UPDATE spirit SET registered_by_id = NULL WHERE registered_by_id = :uid", userId);
        exec("UPDATE spirit_register_request SET reviewed_by_id = NULL WHERE reviewed_by_id = :uid", userId);
        exec("UPDATE producer_register_request SET reviewed_by_id = NULL WHERE reviewed_by_id = :uid", userId);

        // ── 3) 개인 데이터 물리 삭제 (자식 → 부모 순) ───────────────────────
        // BYOB (본인 참여/댓글 + 본인이 주최한 모임 통째로)
        exec("DELETE FROM byob_comments WHERE author_id = :uid OR participant_user_id = :uid", userId);
        exec("DELETE FROM byob_comments WHERE byob_id IN (SELECT id FROM byobs WHERE host_id = :uid)", userId);
        exec("DELETE FROM byob_participants WHERE user_id = :uid", userId);
        exec("DELETE FROM byob_participants WHERE byob_id IN (SELECT id FROM byobs WHERE host_id = :uid)", userId);
        exec("DELETE FROM byob_host_bottles WHERE byob_id IN (SELECT id FROM byobs WHERE host_id = :uid)", userId);
        exec("DELETE FROM byobs WHERE host_id = :uid", userId);
        // 보틀 컬렉션
        exec("DELETE FROM user_bottle_image WHERE user_bottle_id IN "
                + "(SELECT id FROM user_bottle WHERE user_id = :uid)", userId);
        exec("DELETE FROM user_bottle WHERE user_id = :uid", userId);
        // 활동/반응/신고
        exec("DELETE FROM post_likes WHERE user_id = :uid", userId);
        exec("DELETE FROM post_scraps WHERE user_id = :uid", userId);
        exec("DELETE FROM post_reports WHERE reporter_id = :uid", userId);
        exec("DELETE FROM poll_votes WHERE user_id = :uid", userId);
        exec("DELETE FROM comment_like WHERE user_id = :uid", userId);
        exec("DELETE FROM comment_emoji_reactions WHERE user_id = :uid", userId);
        exec("DELETE FROM notice_recommend WHERE user_id = :uid", userId);
        exec("DELETE FROM report WHERE reporter_id = :uid", userId);
        // 점수/출석/위시/임시저장/차단
        exec("DELETE FROM attendance_logs WHERE user_id = :uid", userId);
        exec("DELETE FROM score_history WHERE user_id = :uid", userId);
        exec("DELETE FROM wishlist WHERE user_id = :uid", userId);
        exec("DELETE FROM content_draft WHERE user_id = :uid", userId);
        exec("DELETE FROM user_blocks WHERE blocker_id = :uid OR blocked_id = :uid", userId);
        // 본인이 신청한 등록 요청
        exec("DELETE FROM spirit_register_request WHERE user_id = :uid", userId);
        exec("DELETE FROM producer_register_request WHERE user_id = :uid", userId);
        // 소셜 연동 매핑 (제공자 토큰 포함) 물리 삭제
        exec("DELETE FROM user_social_account WHERE user_id = :uid", userId);
        // 권한 컬렉션
        exec("DELETE FROM user_board_permissions WHERE user_id = :uid", userId);

        // ── 4) Refresh Token 폐기 + users 행 물리 삭제 ──────────────────────
        refreshTokenRepository.deleteByUserId(userId);
        exec("DELETE FROM users WHERE id = :uid", userId);

        // DB 정리 성공 후 프로필 이미지 파일 삭제
        if (profileImageUrl != null) {
            deleteProfileImage(profileImageUrl);
        }
    }

    /** 제공자측 연결 해지 — 저장된 refresh token 을 복호화해 네이버 grant_type=delete / 구글 revoke 호출. */
    private void revokeSocialConnections(Long userId) {
        for (UserSocialAccount account : socialAccountRepository.findByUserId(userId)) {
            try {
                String refresh = oAuthTokenCipher.decrypt(account.getProviderRefreshTokenEnc());
                if (refresh != null) {
                    SocialProvider provider = account.getProvider();
                    oAuthClientRegistry.get(provider).unlink(refresh);
                }
            } catch (Exception e) {
                log.warn("탈퇴 — 소셜 연결 해지 실패(best-effort): provider={}, {}",
                        account.getProvider(), e.getMessage());
            }
        }
    }

    private Long getOrCreateSentinelId() {
        return userRepository.findByEmail(SENTINEL_EMAIL)
                .map(User::getId)
                .orElseGet(() -> {
                    User sentinel = User.builder()
                            .email(SENTINEL_EMAIL)
                            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .nickname(SENTINEL_NICKNAME)
                            .role(Role.MEMBER)
                            .isActive(false)          // 로그인·휴면/삭제 배치 대상에서 모두 제외
                            .emailVerified(true)
                            .build();
                    return userRepository.save(sentinel).getId();
                });
    }

    private void exec(String sql, Long uid) {
        em.createNativeQuery(sql).setParameter("uid", uid).executeUpdate();
    }

    private void reassign(String sql, Long uid, Long sentinelId) {
        em.createNativeQuery(sql)
                .setParameter("uid", uid)
                .setParameter("s", sentinelId)
                .executeUpdate();
    }

    private void deleteProfileImage(String profileImageUrl) {
        int lastSlash = profileImageUrl.lastIndexOf('/');
        if (lastSlash >= 0) {
            String savedFileName = profileImageUrl.substring(lastSlash + 1);
            try {
                fileStorageService.delete(savedFileName, PROFILE_SUB_PATH);
            } catch (Exception e) {
                log.warn("휴면 영구삭제 — 프로필 이미지 삭제 실패: {}", e.getMessage());
            }
        }
    }
}
