package com.drinkindex.domain.admin.entity;

import com.drinkindex.domain.admin.entity.enums.AdminLogTargetType;
import com.drinkindex.domain.admin.entity.enums.AdminLogType;
import com.drinkindex.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
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
public class AdminLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "log_type", nullable = false, length = 30)
    private AdminLogType logType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private AdminLogTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** 목록에 표시할 한 줄 요약 */
    @Column(nullable = false, length = 500)
    private String summary;

    /** 상세 정보 (JSON 직렬화 문자열) */
    @Column(columnDefinition = "TEXT")
    private String detail;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
