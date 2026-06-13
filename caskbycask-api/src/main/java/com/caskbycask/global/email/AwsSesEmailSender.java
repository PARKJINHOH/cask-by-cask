package com.caskbycask.global.email;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * AWS SES 전환 시:
 * 1. build.gradle.kts에 software.amazon.awssdk:ses 추가
 * 2. app.email.provider=ses 로 변경
 * 3. 이 클래스에 SesClient 주입 후 구현
 */
@Component
@ConditionalOnProperty(name = "app.email.provider", havingValue = "ses")
public class AwsSesEmailSender implements EmailSender {

    @Override
    public void send(String to, String subject, String body) {
        throw new UnsupportedOperationException("AWS SES not yet implemented. Add ses SDK dependency and configure.");
    }
}
