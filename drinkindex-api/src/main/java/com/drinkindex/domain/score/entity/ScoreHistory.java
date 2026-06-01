package com.drinkindex.domain.score.entity;

import com.drinkindex.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
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
public class ScoreHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 자유 문자열 액션 키 (지급 시점의 스냅샷)
    @Column(nullable = false, length = 50)
    private String actionType;

    // 실제 지급/차감된 점수 (설정값의 스냅샷)
    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Integer balanceAfter;

    @Column(length = 50)
    private String referenceType;

    private Long referenceId;

    @Column(length = 200)
    private String description;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
