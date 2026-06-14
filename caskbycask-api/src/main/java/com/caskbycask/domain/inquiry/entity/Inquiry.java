package com.caskbycask.domain.inquiry.entity;

import com.caskbycask.domain.inquiry.entity.enums.InquiryCategory;
import com.caskbycask.domain.inquiry.entity.enums.InquiryStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "inquiry",
        indexes = {
                @Index(name = "idx_inquiry_status", columnList = "status"),
                @Index(name = "idx_inquiry_category", columnList = "category"),
                @Index(name = "idx_inquiry_created_at", columnList = "createdAt")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("1:1 문의")
public class Inquiry extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Comment("분류 — ACCOUNT_INQUIRY/BUG_REPORT/CORRECTION_REQUEST/FEATURE_REQUEST/OTHER")
    private InquiryCategory category;

    @Column(nullable = false, length = 200)
    @Comment("제목")
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("문의 내용")
    private String body;

    @Column(nullable = false, length = 200)
    @Comment("문의자 이메일")
    private String senderEmail;

    @Column(columnDefinition = "TEXT")
    @Comment("첨부 이미지 URL(목록)")
    private String imageUrls;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("처리 상태 — PENDING/IN_PROGRESS/RESOLVED")
    private InquiryStatus status = InquiryStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    @Comment("관리자 메모")
    private String adminNote;

    @Column(columnDefinition = "TEXT")
    @Comment("답변 내용")
    private String replyBody;

    @Column(length = 200)
    @Comment("답변자")
    private String repliedBy;

    @Comment("답변 일시")
    private LocalDateTime repliedAt;

    public void updateStatus(InquiryStatus status) {
        this.status = status;
    }

    public void updateAdminNote(String note) {
        this.adminNote = note;
    }

    public void saveReply(String reply, String repliedBy) {
        this.replyBody = reply;
        this.repliedBy = repliedBy;
        this.repliedAt = LocalDateTime.now();
        this.status = InquiryStatus.RESOLVED;
    }
}
