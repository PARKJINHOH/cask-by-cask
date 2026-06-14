package com.caskbycask.domain.admin.entity;

import com.caskbycask.domain.admin.entity.enums.AdminLogTargetType;
import com.caskbycask.domain.admin.entity.enums.AdminLogType;
import com.caskbycask.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "admin_logs",
    indexes = {
        @Index(name = "idx_admin_log_type",       columnList = "log_type"),
        @Index(name = "idx_admin_log_actor",      columnList = "actor_id"),
        @Index(name = "idx_admin_log_created_at", columnList = "created_at")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("관리자 활동 로그")
public class AdminLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "log_type", nullable = false, length = 30)
    @Comment("로그 유형 — ACCOUNT_DELETE/ACCOUNT_SUSPEND/CONTENT_HIDE/CONTENT_RESTORE/ROLE_CHANGE")
    private AdminLogType logType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    @Comment("행위 관리자(users.id)")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    @Comment("대상 유형 — COMMENT/POST/USER")
    private AdminLogTargetType targetType;

    @Column(name = "target_id", nullable = false)
    @Comment("대상 식별자")
    private Long targetId;

    /** 목록에 표시할 한 줄 요약 */
    @Column(nullable = false, length = 500)
    @Comment("요약")
    private String summary;

    /** 상세 정보 (JSON 직렬화 문자열) */
    @Column(columnDefinition = "TEXT")
    @Comment("상세 내용")
    private String detail;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    @Comment("생성 일시")
    private LocalDateTime createdAt;
}
