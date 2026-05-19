package com.drinkindex.global.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.email.provider", havingValue = "smtp", matchIfMissing = true)
@RequiredArgsConstructor
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String from;

    @Override
    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    @Override
    public void sendHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.warn("HTML 이메일 발송 실패, 텍스트로 재시도: to={}", to, e);
            send(to, subject, htmlBody);
        }
    }

    @Override
    public void sendHtmlWithAttachments(
            String to, String subject, String htmlBody,
            List<byte[]> contents, List<String> filenames
    ) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            for (int i = 0; i < contents.size(); i++) {
                String filename = (i < filenames.size() && filenames.get(i) != null)
                        ? filenames.get(i) : "attachment_" + i;
                helper.addAttachment(filename, new ByteArrayResource(contents.get(i)));
            }
            mailSender.send(message);
        } catch (MessagingException e) {
            log.warn("첨부파일 이메일 발송 실패, HTML만 재시도: to={}", to, e);
            sendHtml(to, subject, htmlBody);
        }
    }
}
