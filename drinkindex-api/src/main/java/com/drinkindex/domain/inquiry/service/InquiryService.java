package com.drinkindex.domain.inquiry.service;

import com.drinkindex.domain.inquiry.dto.InquiryRequest;
import com.drinkindex.domain.inquiry.entity.Inquiry;
import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import com.drinkindex.domain.inquiry.repository.InquiryRepository;
import com.drinkindex.global.email.EmailSender;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
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
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final FileStorageService fileStorageService;
    private final EmailSender emailSender;

    @Value("${app.email.inquiry-to}")
    private String inquiryTo;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final long MAX_FILE_SIZE = 2 * 1024 * 1024L;
    private static final long MAX_TOTAL_SIZE = 6 * 1024 * 1024L;
    private static final int MAX_FILE_COUNT = 3;

    @Transactional
    public void submit(InquiryRequest request, List<MultipartFile> images) {
        List<MultipartFile> validImages = (images == null) ? List.of() :
                images.stream().filter(f -> f != null && !f.isEmpty()).toList();

        validateImages(validImages);

        String subPath = "inquiries/" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        List<String> imageUrls = new ArrayList<>();
        List<byte[]> attachmentContents = new ArrayList<>();
        List<String> attachmentNames = new ArrayList<>();

        for (MultipartFile image : validImages) {
            String ext = getExtension(image.getOriginalFilename());
            String savedName = UUID.randomUUID() + "." + ext;
            try {
                // 업로드 전에 바이트 읽기 (transferTo 후에는 스트림이 소비될 수 있음)
                byte[] bytes = image.getBytes();
                String url = fileStorageService.upload(image, savedName, subPath);
                imageUrls.add(url);
                attachmentContents.add(bytes);
                attachmentNames.add(image.getOriginalFilename() != null ? image.getOriginalFilename() : savedName);
            } catch (Exception e) {
                log.error("문의 이미지 업로드 실패", e);
                throw new CustomException(ErrorCode.STORAGE_ERROR);
            }
        }

        String imageUrlsStr = imageUrls.isEmpty() ? null : String.join(",", imageUrls);

        Inquiry inquiry = Inquiry.builder()
                .category(request.category())
                .title(request.title())
                .body(request.body())
                .senderEmail(request.senderEmail())
                .imageUrls(imageUrlsStr)
                .build();

        inquiryRepository.save(inquiry);

        try {
            sendInquiryEmail(inquiry, attachmentContents, attachmentNames);
        } catch (Exception e) {
            log.warn("문의 이메일 발송 실패 (DB 저장 완료): id={}", inquiry.getId(), e);
        }
    }

    private void validateImages(List<MultipartFile> images) {
        if (images.size() > MAX_FILE_COUNT) {
            throw new CustomException(ErrorCode.INQUIRY_TOO_MANY_IMAGES);
        }
        long totalSize = 0;
        for (MultipartFile image : images) {
            if (image.getSize() > MAX_FILE_SIZE) {
                throw new CustomException(ErrorCode.INQUIRY_IMAGE_SIZE_EXCEEDED);
            }
            totalSize += image.getSize();
            String ext = getExtension(image.getOriginalFilename());
            if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
                throw new CustomException(ErrorCode.INQUIRY_INVALID_IMAGE_FORMAT);
            }
        }
        if (totalSize > MAX_TOTAL_SIZE) {
            throw new CustomException(ErrorCode.INQUIRY_TOTAL_IMAGE_SIZE_EXCEEDED);
        }
    }

    private void sendInquiryEmail(Inquiry inquiry, List<byte[]> contents, List<String> filenames) {
        String categoryLabel = getCategoryLabel(inquiry.getCategory());
        String subject = "[DrinkIndex 문의] [%s] %s".formatted(categoryLabel, inquiry.getTitle());

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
        html.append("<p style='white-space:pre-wrap;color:#6b7280;line-height:1.6;'>")
                .append(escapeHtml(inquiry.getBody())).append("</p>");
        html.append("</div>");
        if (!contents.isEmpty()) {
            html.append("<p style='color:#9ca3af;font-size:13px;'>📎 이미지 ").append(contents.size())
                    .append("개 첨부됨</p>");
        }
        html.append("</div>");

        if (!contents.isEmpty()) {
            emailSender.sendHtmlWithAttachments(inquiryTo, subject, html.toString(), contents, filenames);
        } else {
            emailSender.sendHtml(inquiryTo, subject, html.toString());
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
            case OTHER -> "기타";
        };
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
