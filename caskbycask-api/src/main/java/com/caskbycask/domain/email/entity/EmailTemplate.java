package com.caskbycask.domain.email.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "email_templates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("이메일 템플릿")
public class EmailTemplate extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, length = 100)
    @Comment("템플릿 이름")
    private String name;

    @Column(nullable = false, length = 300)
    @Comment("제목")
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("본문")
    private String body;

    public void update(String name, String subject, String body) {
        this.name = name;
        this.subject = subject;
        this.body = body;
    }
}
