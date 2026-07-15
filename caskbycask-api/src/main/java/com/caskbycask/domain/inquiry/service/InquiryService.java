package com.caskbycask.domain.inquiry.service;

import com.caskbycask.domain.inquiry.dto.InquiryRequest;
import com.caskbycask.domain.inquiry.entity.Inquiry;
import com.caskbycask.domain.inquiry.entity.InquiryAttachmentMetadata;
import com.caskbycask.domain.inquiry.entity.enums.InquiryCategory;
import com.caskbycask.domain.inquiry.repository.InquiryRepository;
import com.caskbycask.global.email.AsyncEmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final FileStorageService fileStorageService;
    private final InquiryAttachmentValidator attachmentValidator;
    private final InquiryAttachmentCodec attachmentCodec;
    private final HtmlSanitizer htmlSanitizer;
    // [성능] 문의 알림 메일은 비동기로 발송 — SMTP 지연이 문의 제출 응답을 막지 않도록.
    private final AsyncEmailSender asyncEmailSender;

    @Value("${app.email.inquiry-to}")
    private String inquiryTo;

    @Transactional
    public void submit(InquiryRequest request, List<MultipartFile> attachments) {
        List<MultipartFile> validFiles = (attachments == null) ? List.of() :
                attachments.stream().filter(f -> f != null && !f.isEmpty()).toList();
        List<InquiryAttachmentValidator.ValidatedAttachment> validatedAttachments =
                attachmentValidator.validate(validFiles);

        String sanitizedBody = htmlSanitizer.sanitizeInquiry(request.body());
        String plainBody = htmlSanitizer.sanitizeToPlainText(sanitizedBody).trim();
        if (plainBody.isBlank()) {
            throw new CustomException(ErrorCode.INQUIRY_BODY_REQUIRED);
        }
        if (plainBody.length() > 5_000) {
            throw new CustomException(ErrorCode.INQUIRY_BODY_TOO_LONG);
        }

        String subPath = "inquiries/" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        List<InquiryAttachmentMetadata> attachmentMetadata = new ArrayList<>();
        List<byte[]> attachmentContents = new ArrayList<>();
        List<String> attachmentNames = new ArrayList<>();

        for (int i = 0; i < validFiles.size(); i++) {
            MultipartFile file = validFiles.get(i);
            InquiryAttachmentValidator.ValidatedAttachment validated = validatedAttachments.get(i);
            String storedFilename = UUID.randomUUID() + "." + validated.extension();
            try {
                // 업로드 전에 바이트 읽기 (transferTo 후에는 스트림이 소비될 수 있음)
                byte[] bytes = file.getBytes();
                fileStorageService.upload(file, storedFilename, subPath);
                attachmentMetadata.add(new InquiryAttachmentMetadata(
                        validated.originalFilename(),
                        storedFilename,
                        subPath,
                        validated.contentType(),
                        file.getSize()
                ));
                attachmentContents.add(bytes);
                attachmentNames.add(validated.originalFilename());
            } catch (Exception e) {
                log.error("문의 첨부파일 업로드 실패", e);
                throw new CustomException(ErrorCode.STORAGE_ERROR);
            }
        }

        Inquiry inquiry = Inquiry.builder()
                .category(request.category())
                .title(request.title())
                .body(sanitizedBody)
                .senderEmail(request.senderEmail())
                .attachmentData(attachmentCodec.encode(attachmentMetadata))
                .build();

        inquiryRepository.save(inquiry);

        try {
            sendInquiryEmail(inquiry, attachmentContents, attachmentNames);
        } catch (Exception e) {
            log.warn("문의 이메일 발송 실패 (DB 저장 완료): id={}", inquiry.getId(), e);
        }
    }

    private void sendInquiryEmail(Inquiry inquiry, List<byte[]> contents, List<String> filenames) {
        String categoryLabel = getCategoryLabel(inquiry.getCategory());
        String subject = "[CaskByCask 문의] [%s] %s".formatted(categoryLabel, inquiry.getTitle());

        StringBuilder html = new StringBuilder();
        html.append("<div style='font-family:sans-serif;max-width:600px;margin:0 auto;'>");
        html.append("<h2 style='color:#d97706;border-bottom:2px solid #fef3c7;padding-bottom:8px;'>새 문의가 접수되었습니다</h2>");
        html.append("<table style='width:100%;border-collapse:collapse;margin-bottom:20px;'>");
        appendRow(html, "문의 유형", categoryLabel);
        appendRow(html, "제목", inquiry.getTitle());
        appendRow(html, "이메일", inquiry.getSenderEmail());
        html.append("</table>");
        html.append("<div style='background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;'>");
        html.append("<h3 style='margin-top:0;color:#374151;'>문의 내용</h3>");
        html.append("<div style='color:#6b7280;line-height:1.6;'>")
                .append(inquiry.getBody()).append("</div>");
        html.append("</div>");
        if (!contents.isEmpty()) {
            html.append("<p style='color:#9ca3af;font-size:13px;'>📎 파일 ").append(contents.size())
                    .append("개 첨부됨</p>");
        }
        html.append("</div>");

        if (!contents.isEmpty()) {
            asyncEmailSender.sendHtmlWithAttachments(inquiryTo, subject, html.toString(), contents, filenames);
        } else {
            asyncEmailSender.sendHtml(inquiryTo, subject, html.toString());
        }
    }

    private void appendRow(StringBuilder sb, String label, String value) {
        sb.append("<tr>")
                .append("<td style='padding:10px 12px;font-weight:600;background:#f9fafb;width:100px;border:1px solid #e5e7eb;'>")
                .append(escapeHtml(label)).append("</td>")
                .append("<td style='padding:10px 12px;border:1px solid #e5e7eb;'>")
                .append(escapeHtml(value)).append("</td>")
                .append("</tr>");
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String getCategoryLabel(InquiryCategory category) {
        return switch (category) {
            case BUG_REPORT -> "버그 신고";
            case FEATURE_REQUEST -> "기능 제안";
            case ACCOUNT_INQUIRY -> "계정 문의";
            case CORRECTION_REQUEST -> "정보 수정 요청";
            case PARTNERSHIP_INQUIRY -> "파트너 및 제휴 관련";
            case OTHER -> "기타";
        };
    }

}
