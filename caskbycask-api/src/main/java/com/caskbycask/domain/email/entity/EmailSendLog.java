package com.caskbycask.domain.email.entity;

import com.caskbycask.domain.email.entity.enums.EmailSendType;
import jakarta.persistence.*;
import lombok.*;
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
public class EmailSendLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EmailSendType sendType;

    @Column(nullable = false, length = 300)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false)
    private int totalCount;

    @Column(nullable = false)
    private int successCount;

    @Column(nullable = false)
    private int failCount;

    @CreatedDate
    @Column(updatable = false, nullable = false)
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
