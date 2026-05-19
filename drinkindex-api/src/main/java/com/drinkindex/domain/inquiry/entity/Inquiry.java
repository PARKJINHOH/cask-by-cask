package com.drinkindex.domain.inquiry.entity;

import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import com.drinkindex.domain.inquiry.entity.enums.InquiryStatus;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

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
public class Inquiry extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InquiryCategory category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false, length = 200)
    private String senderEmail;

    @Column(columnDefinition = "TEXT")
    private String imageUrls;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private InquiryStatus status = InquiryStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String adminNote;

    @Column(columnDefinition = "TEXT")
    private String replyBody;

    @Column(length = 200)
    private String repliedBy;

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
