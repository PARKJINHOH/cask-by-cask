package com.caskbycask.domain.user.service;

import com.caskbycask.domain.community.entity.Notification;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.UserSocialAccount;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.entity.enums.SocialProvider;
import com.caskbycask.domain.user.repository.UserSocialAccountRepository;
import com.caskbycask.global.auth.jwt.RefreshTokenRepository;
import com.caskbycask.global.auth.oauth.OAuthProviderClient;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import com.caskbycask.global.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class, AccountHardDeleteService.class,
        AccountHardDeleteServiceTest.TestConfig.class})
class AccountHardDeleteServiceTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        PasswordEncoder passwordEncoder() {
            return org.mockito.Mockito.mock(PasswordEncoder.class);
        }
    }

    @Autowired private AccountHardDeleteService accountHardDeleteService;
    @Autowired private com.caskbycask.domain.user.repository.UserRepository userRepository;
    @Autowired private UserSocialAccountRepository socialAccountRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockBean private RefreshTokenRepository refreshTokenRepository;
    @MockBean private FileStorageService fileStorageService;
    // 소셜 연동 해지 의존성 — @DataJpaTest 범위 밖이라 모킹 (연동 없는 사용자는 호출되지 않음)
    @MockBean private com.caskbycask.global.auth.oauth.OAuthClientRegistry oAuthClientRegistry;
    @MockBean private com.caskbycask.global.auth.oauth.OAuthTokenCipher oAuthTokenCipher;

    @PersistenceContext
    private EntityManager em;

    @BeforeEach
    void setUp() {
        given(passwordEncoder.encode(anyString())).willReturn("encoded");
    }

    @Test
    @DisplayName("계정 영구삭제 — users 행 물리 삭제 + 게시글은 센티넬로 재귀속, 모든 연관 테이블 정리 SQL 정상 실행")
    void hardDelete_removesUserAndReassignsContent() {
        User user = userRepository.save(User.builder()
                .email("victim@example.com").password("pw").nickname("홍길동").role(Role.MEMBER).build());
        Long userId = user.getId();

        Post post = Post.builder()
                .author(user)
                .boardType(BoardType.FREE)
                .title("보존되어야 하는 게시글")
                .content("<p>본문</p>")
                .contentSanitized("<p>본문</p>")
                .build();
        em.persist(post);
        Long postId = post.getId();

        // 받은 알림 — 파기하지 않고 센티넬로 재귀속 보존되어야 함
        Notification noti = Notification.builder()
                .recipient(user)
                .type(NotificationType.SYSTEM)
                .message("탈퇴자에게 온 알림")
                .build();
        em.persist(noti);
        Long notiId = noti.getId();
        em.flush();

        // when — 모든 연관 테이블 정리 네이티브 SQL이 빈 테이블 포함 전부 실행됨(테이블/컬럼명 검증)
        accountHardDeleteService.hardDelete(userId);
        em.flush();
        em.clear();

        // then — 계정 행은 물리 삭제
        assertThat(userRepository.findById(userId)).isEmpty();

        // 센티넬 계정 생성됨
        User sentinel = userRepository.findByEmail("withdrawn@caskbycask.system").orElseThrow();
        assertThat(sentinel.getNickname()).isEqualTo("탈퇴한사용자");

        // 게시글은 삭제되지 않고 센티넬로 재귀속
        Post reloaded = em.find(Post.class, postId);
        assertThat(reloaded).isNotNull();
        assertThat(reloaded.getAuthor().getId()).isEqualTo(sentinel.getId());

        // 알림은 파기되지 않고 센티넬로 재귀속 보존
        Notification reloadedNoti = em.find(Notification.class, notiId);
        assertThat(reloadedNoti).isNotNull();
        assertThat(reloadedNoti.getRecipient().getId()).isEqualTo(sentinel.getId());
    }

    @Test
    @DisplayName("소셜 전용 계정(비밀번호 없음) 탈퇴 — 제공자 연결해지 호출 + 연동 매핑 물리 삭제 + users 삭제")
    void hardDelete_socialOnlyAccount_revokesProviderAndRemovesMapping() {
        // given — 비밀번호 없는 소셜(네이버) 전용 가입자
        User user = userRepository.save(User.builder()
                .email("social@example.com").password(null).nickname("소셜러").role(Role.MEMBER).build());
        Long userId = user.getId();

        socialAccountRepository.save(UserSocialAccount.builder()
                .user(user)
                .provider(SocialProvider.NAVER)
                .providerUserId("naver-uid-123")
                .email("social@example.com")
                .providerRefreshTokenEnc("enc-refresh-token")
                .linkedAt(LocalDateTime.now())
                .build());
        em.flush();

        // 저장된 암호문 → 평문 refresh token 복호화, 해당 provider 클라이언트로 연결해지 호출되어야 함
        OAuthProviderClient naverClient = mock(OAuthProviderClient.class);
        given(oAuthTokenCipher.decrypt("enc-refresh-token")).willReturn("plain-refresh-token");
        given(oAuthClientRegistry.get(SocialProvider.NAVER)).willReturn(naverClient);

        // when
        accountHardDeleteService.hardDelete(userId);
        em.flush();
        em.clear();

        // then — 제공자 연결해지(네이버 grant_type=delete)가 평문 토큰으로 호출됨
        verify(naverClient).unlink("plain-refresh-token");

        // 연동 매핑 물리 삭제
        assertThat(socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.NAVER, "naver-uid-123"))
                .isEmpty();
        assertThat(socialAccountRepository.findByUserId(userId)).isEmpty();

        // users 행 물리 삭제
        assertThat(userRepository.findById(userId)).isEmpty();
    }
}
