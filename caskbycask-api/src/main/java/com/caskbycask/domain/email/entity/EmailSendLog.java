package com.caskbycask.domain.email.entity;

import com.caskbycask.domain.email.entity.enums.EmailSendType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "email_send_logs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("이메일 발송 로그")
public class EmailSendLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Comment("발송 유형 — BULK(일괄)/TEST")
    private EmailSendType sendType;

    @Column(nullable = false, length = 300)
    @Comment("제목")
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("본문")
    private String body;

    @Column(nullable = false)
    @Comment("전체 대상 건수")
    private int totalCount;

    @Column(nullable = false)
    @Comment("성공 건수")
    private int successCount;

    @Column(nullable = false)
    @Comment("실패 건수")
    private int failCount;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    @Comment("발송 일시")
    private LocalDateTime sentAt;

    @Builder.Default
    @OneToMany(mappedBy = "log", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EmailSendRecipient> recipients = new ArrayList<>();

    public void addRecipient(EmailSendRecipient recipient) {
        recipients.add(recipient);
        recipient.assignLog(this);
    }

    public void updateCounts(int successCount, int failCount) {
        this.successCount = successCount;
        this.failCount = failCount;
        this.totalCount = successCount + failCount;
    }
}
