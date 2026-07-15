package com.caskbycask.admin.service;

import com.caskbycask.domain.inquiry.dto.InquiryDetailResponse;
import com.caskbycask.domain.inquiry.dto.InquiryAttachmentResponse;
import com.caskbycask.domain.inquiry.dto.InquiryListResponse;
import com.caskbycask.domain.inquiry.entity.Inquiry;
import com.caskbycask.domain.inquiry.entity.enums.InquiryCategory;
import com.caskbycask.domain.inquiry.entity.enums.InquiryStatus;
import com.caskbycask.domain.inquiry.repository.InquiryRepository;
import com.caskbycask.domain.inquiry.service.InquiryAttachmentCodec;
import com.caskbycask.domain.inquiry.service.InquiryAttachmentDownload;
import com.caskbycask.domain.inquiry.service.InquiryAttachmentStorage;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminInquiryService {

    private final InquiryRepository inquiryRepository;
    private final EmailSender emailSender;
    private final InquiryAttachmentCodec attachmentCodec;
    private final InquiryAttachmentStorage attachmentStorage;

    @Transactional(readOnly = true)
    public long pendingCount() {
        return inquiryRepository.countByStatusNot(InquiryStatus.RESOLVED);
    }

    @Transactional(readOnly = true)
    public Page<InquiryListResponse> list(InquiryStatus status, InquiryCategory category, int page) {
        Pageable pageable = PageRequest.of(page, 20, Sort.by("createdAt").descending());
        Page<Inquiry> result;
        if (status != null && category != null) {
            result = inquiryRepository.findByStatusAndCategory(status, category, pageable);
        } else if (status != null) {
            result = inquiryRepository.findByStatus(status, pageable);
        } else if (category != null) {
            result = inquiryRepository.findByCategory(category, pageable);
        } else {
            result = inquiryRepository.findAll(pageable);
        }
        return result.map(InquiryListResponse::from);
    }

    @Transactional(readOnly = true)
    public InquiryDetailResponse detail(Long id) {
        Inquiry inquiry = findById(id);
        return InquiryDetailResponse.from(
                inquiry,
                attachmentCodec.decode(inquiry.getAttachmentData()).stream()
                        .map(InquiryAttachmentResponse::from)
                        .toList()
        );
    }

    @Transactional(readOnly = true)
    public InquiryAttachmentDownload downloadAttachment(Long inquiryId, String fileKey) {
        Inquiry inquiry = findById(inquiryId);
        return attachmentCodec.decode(inquiry.getAttachmentData()).stream()
                .filter(attachment -> attachment.storedFilename().equals(fileKey))
                .findFirst()
                .map(attachmentStorage::load)
                .orElseThrow(() -> new CustomException(ErrorCode.INQUIRY_ATTACHMENT_NOT_FOUND));
    }

    @Transactional
    public void updateStatus(Long id, InquiryStatus status) {
        findById(id).updateStatus(status);
    }

    @Transactional
    public void updateNote(Long id, String note) {
        findById(id).updateAdminNote(note);
    }

    @Transactional
    public void reply(Long id, String replyBody, String replierEmail) {
        Inquiry inquiry = findById(id);
        sendReplyEmail(inquiry, replyBody);
        inquiry.saveReply(replyBody, replierEmail);
    }

    private void sendReplyEmail(Inquiry inquiry, String replyBody) {
        String subject = "[CaskByCask] 문의 답변 드립니다: " + inquiry.getTitle();

        StringBuilder html = new StringBuilder();
        html.append("<div style='font-family:sans-serif;max-width:600px;margin:0 auto;'>");
        html.append("<h2 style='color:#d97706;border-bottom:2px solid #fef3c7;padding-bottom:8px;'>문의 답변</h2>");
        html.append("<p style='color:#6b7280;font-size:14px;'>안녕하세요. CaskByCask 운영팀입니다.<br>")
                .append("아래와 같이 문의 답변 드립니다.</p>");

        html.append("<div style='background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;")
                .append("padding:16px;margin:20px 0;'>");
        html.append("<p style='font-size:12px;color:#9ca3af;margin:0 0 4px;'>원본 문의</p>");
        html.append("<p style='font-size:14px;font-weight:600;color:#374151;margin:0;'>")
                .append(escapeHtml(inquiry.getTitle())).append("</p>");
        html.append("</div>");

        html.append("<div style='background:#fff;border:1px solid #d97706;border-radius:8px;padding:16px;margin-bottom:24px;'>");
        html.append("<p style='font-size:12px;color:#d97706;margin:0 0 8px;font-weight:600;'>답변 내용</p>");
        html.append("<p style='white-space:pre-wrap;color:#374151;line-height:1.7;margin:0;'>")
                .append(escapeHtml(replyBody)).append("</p>");
        html.append("</div>");

        html.append("<p style='color:#9ca3af;font-size:12px;'>추가 문의사항이 있으시면 언제든지 다시 문의해 주세요.</p>");
        html.append("<p style='color:#9ca3af;font-size:12px;'>감사합니다.<br>CaskByCask 운영팀</p>");
        html.append("</div>");

        emailSender.sendHtml(inquiry.getSenderEmail(), subject, html.toString());
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private Inquiry findById(Long id) {
        return inquiryRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.INQUIRY_NOT_FOUND));
    }
}
