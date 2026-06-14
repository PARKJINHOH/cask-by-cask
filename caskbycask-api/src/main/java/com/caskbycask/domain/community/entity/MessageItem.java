package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class MessageItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    @Comment("쪽지 대화(messages.id)")
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @Comment("보낸 사람(users.id)")
    private User sender;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    @Comment("메시지 내용")
    private String content;

    @Builder.Default
    @Column(nullable = false)
    @Comment("읽음 여부")
    private Boolean isRead = false;

    @Comment("읽은 일시")
    private LocalDateTime readAt;

    public void markRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}
