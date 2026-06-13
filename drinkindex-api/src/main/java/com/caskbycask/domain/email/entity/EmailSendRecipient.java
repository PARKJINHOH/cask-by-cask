package com.caskbycask.domain.email.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "email_send_recipients",
        indexes = @Index(name = "idx_email_recipient_log", columnList = "log_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class EmailSendRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "log_id")
    private EmailSendLog log;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 20)
    private String nickname;

    @Column(nullable = false)
    private boolean success;

    @Column(length = 500)
    private String errorMessage;

    void assignLog(EmailSendLog log) {
        this.log = log;
    }
}
