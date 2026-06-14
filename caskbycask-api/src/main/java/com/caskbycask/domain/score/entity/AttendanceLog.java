package com.caskbycask.domain.score.entity;

import com.caskbycask.domain.score.entity.enums.StreakBonus;
import com.caskbycask.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDate;

@Entity
@Table(
        name = "attendance_logs",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_attendance_user_date", columnNames = {"user_id", "attendance_date"})
        },
        indexes = {
                @Index(name = "idx_attendance_user_date", columnList = "user_id, attendance_date")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("출석 체크 로그")
public class AttendanceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;

    @Column(nullable = false)
    @Comment("출석 일자")
    private LocalDate attendanceDate;

    // 이날 기준 연속 출석 일수. 1부터 시작.
    @Column(nullable = false)
    @Comment("연속 출석 일수")
    private Integer streakCount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("지급 보너스 — NONE/STREAK_7/STREAK_30")
    private StreakBonus bonusAwarded = StreakBonus.NONE;

    public void updateBonus(StreakBonus bonus) {
        this.bonusAwarded = bonus;
    }
}
