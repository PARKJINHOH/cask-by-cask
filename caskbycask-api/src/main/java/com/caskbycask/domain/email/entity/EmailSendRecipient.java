package com.caskbycask.domain.email.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "email_send_recipients",
        indexes = @Index(name = "idx_email_recipient_log", columnList = "log_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("이메일 수신자별 발송 결과")
public class EmailSendRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "log_id")
    @Comment("발송 로그(email_send_logs.id)")
    private EmailSendLog log;

    @Column(nullable = false, length = 255)
    @Comment("수신 이메일")
    private String email;

    @Column(length = 20)
    @Comment("수신자 닉네임")
    private String nickname;

    @Column(nullable = false)
    @Comment("발송 성공 여부")
    private boolean success;

    @Column(length = 500)
    @Comment("실패 사유")
    private String errorMessage;

    void assignLog(EmailSendLog log) {
        this.log = log;
    }
}
