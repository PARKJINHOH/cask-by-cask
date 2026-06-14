package com.caskbycask.global.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 사용자 대면 흐름(회원가입 인증코드·비밀번호 재설정·문의 알림)용 비동기 이메일 발송기.
 *
 * SMTP 응답 지연/실패가 요청 스레드를 블로킹하거나 트랜잭션을 롤백시키지 않도록
 * fire-and-forget 으로 분리한다. 발송 실패는 로그만 남기고 흐름을 막지 않는다.
 *
 * ※ 발송 성공/실패 결과가 필요한 관리자 대량·테스트 발송(AdminEmailService)은
 *   동기 {@link EmailSender} 를 그대로 사용한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncEmailSender {

    private final EmailSender emailSender;

    @Async
    public void sendHtml(String to, String subject, String htmlBody) {
        try {
            emailSender.sendHtml(to, subject, htmlBody);
        } catch (Exception e) {
            log.warn("비동기 이메일 발송 실패: to={}", to, e);
        }
    }

    @Async
    public void sendHtmlWithAttachments(String to, String subject, String htmlBody,
                                        List<byte[]> contents, List<String> filenames) {
        try {
            emailSender.sendHtmlWithAttachments(to, subject, htmlBody, contents, filenames);
        } catch (Exception e) {
            log.warn("비동기 첨부 이메일 발송 실패: to={}", to, e);
        }
    }
}
