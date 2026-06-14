package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Message extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @Comment("발신자(users.id)")
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    @Comment("수신자(users.id)")
    private User receiver;

    @Builder.Default
    @Column(nullable = false)
    @Comment("발신자 삭제 여부")
    private Boolean isDeletedBySender = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("수신자 삭제 여부")
    private Boolean isDeletedByReceiver = false;

    @Builder.Default
    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MessageItem> items = new ArrayList<>();

    public void deleteBySender()   { this.isDeletedBySender = true; }
    public void deleteByReceiver() { this.isDeletedByReceiver = true; }
}
