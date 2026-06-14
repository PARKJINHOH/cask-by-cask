package com.caskbycask.global.auth.oauth;

import com.caskbycask.domain.user.entity.enums.SocialProvider;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

/**
 * 소셜 로그인 단계 간 상태 전달용 단명 저장소 (Redis).
 *
 * - state : CSRF 방어. 인가 URL 발급 시 생성·저장, 콜백에서 provider 일치 확인 후 소모.
 * - ticket: code 교환으로 확인한 제공자 신원(+암호화 refresh token)을 다음 단계(가입완료/연동)로 전달.
 *           클라이언트가 보낸 provider 신원은 절대 신뢰하지 않고, 항상 이 티켓의 서버측 값만 사용한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuthTicketStore {

    private static final String STATE_PREFIX = "oauth:state:";
    private static final String TICKET_PREFIX = "oauth:ticket:";
    private static final Duration STATE_TTL = Duration.ofMinutes(10);
    private static final Duration TICKET_TTL = Duration.ofMinutes(10);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final SecureRandom random = new SecureRandom();

    // ── state (CSRF) ────────────────────────────────────────────
    public String issueState(SocialProvider provider) {
        String state = randomToken();
        redisTemplate.opsForValue().set(STATE_PREFIX + state, provider.name(), STATE_TTL);
        return state;
    }

    /** state 가 존재하고 provider 와 일치하면 소모(삭제). 아니면 OAUTH_STATE_INVALID. */
    public void consumeState(String state, SocialProvider provider) {
        String stored = redisTemplate.opsForValue().get(STATE_PREFIX + state);
        if (stored == null || !stored.equals(provider.name())) {
            throw new CustomException(ErrorCode.OAUTH_STATE_INVALID);
        }
        redisTemplate.delete(STATE_PREFIX + state);
    }

    // ── ticket (signup / link) ──────────────────────────────────
    public String issueTicket(OAuthTicket ticket) {
        String id = randomToken();
        try {
            redisTemplate.opsForValue().set(TICKET_PREFIX + id, objectMapper.writeValueAsString(ticket), TICKET_TTL);
        } catch (Exception e) {
            log.error("Failed to serialize OAuth ticket", e);
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
        return id;
    }

    /** 티켓을 읽고 즉시 소모(삭제). 없거나 만료면 OAUTH_TICKET_EXPIRED. */
    public OAuthTicket consumeTicket(String ticketId) {
        String json = redisTemplate.opsForValue().get(TICKET_PREFIX + ticketId);
        if (json == null) {
            throw new CustomException(ErrorCode.OAUTH_TICKET_EXPIRED);
        }
        redisTemplate.delete(TICKET_PREFIX + ticketId);
        try {
            return objectMapper.readValue(json, OAuthTicket.class);
        } catch (Exception e) {
            log.error("Failed to deserialize OAuth ticket", e);
            throw new CustomException(ErrorCode.OAUTH_TICKET_EXPIRED);
        }
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
