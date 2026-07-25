package com.caskbycask.domain.social.entity;

import com.caskbycask.domain.social.entity.enums.SocialDataDeletionStatus;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "social_data_deletion_requests",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_social_data_deletion_confirmation_code",
                columnNames = "confirmation_code"))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SocialDataDeletionRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "confirmation_code", nullable = false, length = 32)
    private String confirmationCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialPlatform platform;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialDataDeletionStatus status;

    @Column(nullable = false)
    private LocalDateTime completedAt;
}
