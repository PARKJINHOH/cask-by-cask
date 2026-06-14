package com.caskbycask.domain.score.entity;

import com.caskbycask.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

// BaseTimeEntity 대신 createdAt만 사용 (updatedAt 불필요, 90일 삭제 배치 기준)
@Entity
@Table(
        name = "score_history",
        indexes = {
                @Index(name = "idx_score_history_user_created", columnList = "user_id, created_at"),
                @Index(name = "idx_score_history_user_action_created", columnList = "user_id, action_type, created_at")
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("점수 적립/차감 이력")
public class ScoreHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;

    // 자유 문자열 액션 키 (지급 시점의 스냅샷)
    @Column(nullable = false, length = 50)
    @Comment("행동 유형")
    private String actionType;

    // 실제 지급/차감된 점수 (설정값의 스냅샷)
    @Column(nullable = false)
    @Comment("증감 점수")
    private Integer score;

    @Column(nullable = false)
    @Comment("적립 후 잔액")
    private Integer balanceAfter;

    @Column(length = 50)
    @Comment("관련 대상 유형")
    private String referenceType;

    @Comment("관련 대상 식별자")
    private Long referenceId;

    @Column(length = 200)
    @Comment("설명")
    private String description;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    @Comment("생성 일시")
    private LocalDateTime createdAt;
}
