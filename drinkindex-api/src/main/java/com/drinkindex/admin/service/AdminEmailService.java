package com.drinkindex.admin.service;

import com.drinkindex.admin.dto.*;
import com.drinkindex.domain.email.entity.EmailSendLog;
import com.drinkindex.domain.email.entity.EmailSendRecipient;
import com.drinkindex.domain.email.entity.EmailTemplate;
import com.drinkindex.domain.email.entity.enums.EmailSendType;
import com.drinkindex.domain.email.repository.EmailSendLogRepository;
import com.drinkindex.domain.email.repository.EmailTemplateRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.email.EmailSender;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminEmailService {

    private final UserRepository userRepository;
    private final EmailSender emailSender;
    private final EmailSendLogRepository emailSendLogRepository;
    private final EmailTemplateRepository emailTemplateRepository;

    // ── 발송 ─────────────────────────────────────────────────────────

    @Transactional
    public SendEmailResult sendTestEmail(SendEmailRequest request) {
        boolean success = true;
        String errorMessage = null;
        try {
            emailSender.sendHtml(request.testEmail(), request.subject(), request.body());
        } catch (Exception e) {
            log.error("테스트 이메일 발송 실패: to={}", request.testEmail(), e);
            success = false;
            errorMessage = e.getMessage();
        }

        EmailSendLog logEntity = EmailSendLog.builder()
                .sendType(EmailSendType.TEST)
                .subject(request.subject())
                .body(request.body())
                .totalCount(1)
                .successCount(success ? 1 : 0)
                .failCount(success ? 0 : 1)
                .build();

        EmailSendRecipient recipient = EmailSendRecipient.builder()
                .email(request.testEmail())
                .success(success)
                .errorMessage(errorMessage)
                .build();
        logEntity.addRecipient(recipient);
        emailSendLogRepository.save(logEntity);

        return new SendEmailResult(success ? 1 : 0, success ? 0 : 1, true);
    }

    @Transactional
    public SendEmailResult sendBulkEmail(SendEmailRequest request) {
        List<User> subscribers = userRepository.findAllByEmailSubscribedTrue();
        int successCount = 0;
        int failCount = 0;

        EmailSendLog logEntity = EmailSendLog.builder()
                .sendType(EmailSendType.BULK)
                .subject(request.subject())
                .body(request.body())
                .totalCount(subscribers.size())
                .successCount(0)
                .failCount(0)
                .build();

        for (User user : subscribers) {
            boolean ok = true;
            String errorMessage = null;
            try {
                emailSender.sendHtml(user.getEmail(), request.subject(), request.body());
                successCount++;
            } catch (Exception e) {
                log.error("이메일 발송 실패: to={}", user.getEmail(), e);
                errorMessage = e.getMessage();
                ok = false;
                failCount++;
            }
            logEntity.addRecipient(EmailSendRecipient.builder()
                    .email(user.getEmail())
                    .nickname(user.getNickname())
                    .success(ok)
                    .errorMessage(errorMessage)
                    .build());
        }

        logEntity.updateCounts(successCount, failCount);
        emailSendLogRepository.save(logEntity);

        return new SendEmailResult(successCount, failCount, false);
    }

    public int countSubscribers() {
        return userRepository.findAllByEmailSubscribedTrue().size();
    }

    // ── 이력 ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<EmailSendLogResponse> getLogs(Pageable pageable) {
        return emailSendLogRepository.findAllOrderBySentAtDesc(pageable)
                .map(EmailSendLogResponse::from);
    }

    @Transactional(readOnly = true)
    public EmailSendLogDetailResponse getLogDetail(Long id) {
        EmailSendLog log = emailSendLogRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        return EmailSendLogDetailResponse.from(log);
    }

    // ── 템플릿 ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmailTemplateResponse> getTemplates() {
        return emailTemplateRepository.findAll().stream()
                .map(EmailTemplateResponse::from)
                .toList();
    }

    @Transactional
    public EmailTemplateResponse createTemplate(EmailTemplateRequest request) {
        EmailTemplate template = EmailTemplate.builder()
                .name(request.name())
                .subject(request.subject())
                .body(request.body())
                .build();
        return EmailTemplateResponse.from(emailTemplateRepository.save(template));
    }

    @Transactional
    public EmailTemplateResponse updateTemplate(Long id, EmailTemplateRequest request) {
        EmailTemplate template = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        template.update(request.name(), request.subject(), request.body());
        return EmailTemplateResponse.from(template);
    }

    @Transactional
    public void deleteTemplate(Long id) {
        if (!emailTemplateRepository.existsById(id)) {
            throw new CustomException(ErrorCode.NOT_FOUND);
        }
        emailTemplateRepository.deleteById(id);
    }
}
