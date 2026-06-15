package com.caskbycask.global.email;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration COOLDOWN_TTL = Duration.ofSeconds(30);
    private static final Duration PREVERIFIED_TTL = Duration.ofMinutes(30);
    private static final String CODE_PREFIX = "email:verify:";
    private static final String COOLDOWN_PREFIX = "email:cooldown:";
    private static final String PREVERIFIED_PREFIX = "email:preverified:";
    // 비밀번호 재설정은 회원가입 인증과 별도 네임스페이스로 분리해 코드 충돌을 방지한다.
    private static final String RESET_CODE_PREFIX = "email:pwreset:";
    private static final String RESET_COOLDOWN_PREFIX = "email:pwreset:cooldown:";

    private final StringRedisTemplate redisTemplate;
    // [성능] SMTP 지연/실패가 회원가입·인증 요청을 블로킹/롤백하지 않도록 비동기 발송.
    private final AsyncEmailSender asyncEmailSender;

    public void sendCode(String email) {
        if (Boolean.TRUE.equals(redisTemplate.hasKey(COOLDOWN_PREFIX + email))) {
            throw new CustomException(ErrorCode.VERIFICATION_COOLDOWN);
        }

        String code = generateCode();
        redisTemplate.opsForValue().set(CODE_PREFIX + email, code, CODE_TTL);
        redisTemplate.opsForValue().set(COOLDOWN_PREFIX + email, "1", COOLDOWN_TTL);

        asyncEmailSender.sendHtml(
            email,
            "[CaskByCask] 이메일 인증 코드",
            buildHtmlBody(code)
        );
    }

    public void verifyCode(String email, String code) {
        String stored = redisTemplate.opsForValue().get(CODE_PREFIX + email);
        if (stored == null) {
            throw new CustomException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }
        if (!stored.equals(code)) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        }
        redisTemplate.delete(CODE_PREFIX + email);
        redisTemplate.delete(COOLDOWN_PREFIX + email);
    }

    /** 비밀번호 재설정용 인증 코드 발송 (회원가입 인증과 별도 코드). */
    public void sendPasswordResetCode(String email) {
        if (Boolean.TRUE.equals(redisTemplate.hasKey(RESET_COOLDOWN_PREFIX + email))) {
            throw new CustomException(ErrorCode.VERIFICATION_COOLDOWN);
        }

        String code = generateCode();
        redisTemplate.opsForValue().set(RESET_CODE_PREFIX + email, code, CODE_TTL);
        redisTemplate.opsForValue().set(RESET_COOLDOWN_PREFIX + email, "1", COOLDOWN_TTL);

        asyncEmailSender.sendHtml(
            email,
            "[CaskByCask] 비밀번호 재설정 인증 코드",
            buildResetHtmlBody(code)
        );
    }

    /**
     * 비밀번호 재설정 코드 검증.
     * @param consume true 면 검증 성공 시 코드를 소모(삭제)한다. 중간 확인 단계에서는 false 로 호출해 코드를 보존한다.
     */
    public void verifyPasswordResetCode(String email, String code, boolean consume) {
        String stored = redisTemplate.opsForValue().get(RESET_CODE_PREFIX + email);
        if (stored == null) {
            throw new CustomException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }
        if (!stored.equals(code)) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        }
        if (consume) {
            redisTemplate.delete(RESET_CODE_PREFIX + email);
            redisTemplate.delete(RESET_COOLDOWN_PREFIX + email);
        }
    }

    public void markPreVerified(String email) {
        redisTemplate.opsForValue().set(PREVERIFIED_PREFIX + email, "1", PREVERIFIED_TTL);
    }

    public boolean isPreVerified(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREVERIFIED_PREFIX + email));
    }

    public void clearPreVerified(String email) {
        redisTemplate.delete(PREVERIFIED_PREFIX + email);
    }

    private String generateCode() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    private String buildHtmlBody(String code) {
        return """
                <!DOCTYPE html>
                <html lang="ko">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                        <!-- Header -->
                        <tr><td style="background:#92400e;padding:28px 32px;text-align:center;">
                          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">CaskByCask</p>
                          <p style="margin:6px 0 0;font-size:13px;color:#fde68a;">위스키·와인·꼬냑 주류 리뷰 커뮤니티</p>
                        </td></tr>
                        <!-- Body -->
                        <tr><td style="padding:36px 32px 28px;">
                          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;">이메일 인증 코드</p>
                          <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
                            아래 인증 코드를 입력창에 입력해주세요.<br>코드는 발급 후 <strong>5분간</strong> 유효합니다.
                          </p>
                          <!-- Code Box -->
                          <div style="background:#fef3c7;border:2px dashed #f59e0b;border-radius:10px;padding:20px;text-align:center;margin-bottom:28px;">
                            <p style="margin:0;font-size:36px;font-weight:700;color:#92400e;letter-spacing:12px;font-family:'Courier New',monospace;">%s</p>
                          </div>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                            본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.<br>
                            계정 보안에 문제가 있다고 생각되시면 고객센터로 문의해주세요.
                          </p>
                        </td></tr>
                        <!-- Footer -->
                        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#9ca3af;">© 2026 CaskByCask. All rights reserved.</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(code);
    }

    private String buildResetHtmlBody(String code) {
        return """
                <!DOCTYPE html>
                <html lang="ko">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                        <!-- Header -->
                        <tr><td style="background:#92400e;padding:28px 32px;text-align:center;">
                          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">CaskByCask</p>
                          <p style="margin:6px 0 0;font-size:13px;color:#fde68a;">위스키·와인·꼬냑 주류 리뷰 커뮤니티</p>
                        </td></tr>
                        <!-- Body -->
                        <tr><td style="padding:36px 32px 28px;">
                          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;">비밀번호 재설정 인증 코드</p>
                          <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
                            비밀번호 재설정을 위해 아래 인증 코드를 입력창에 입력해주세요.<br>코드는 발급 후 <strong>5분간</strong> 유효합니다.
                          </p>
                          <!-- Code Box -->
                          <div style="background:#fef3c7;border:2px dashed #f59e0b;border-radius:10px;padding:20px;text-align:center;margin-bottom:28px;">
                            <p style="margin:0;font-size:36px;font-weight:700;color:#92400e;letter-spacing:12px;font-family:'Courier New',monospace;">%s</p>
                          </div>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                            본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.<br>
                            계정이 도용되었다고 의심되면 즉시 고객센터로 문의해주세요.
                          </p>
                        </td></tr>
                        <!-- Footer -->
                        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
                          <p style="margin:0;font-size:11px;color:#9ca3af;">© 2026 CaskByCask. All rights reserved.</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(code);
    }
}
