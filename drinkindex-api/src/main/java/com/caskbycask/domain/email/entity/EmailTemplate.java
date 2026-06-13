package com.caskbycask.domain.email.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "email_templates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class EmailTemplate extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 300)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    public void update(String name, String subject, String body) {
        this.name = name;
        this.subject = subject;
        this.body = body;
    }
}
