package com.drinkindex.domain.score.entity;

import com.drinkindex.domain.score.entity.enums.StreakBonus;
import com.drinkindex.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

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
public class AttendanceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate attendanceDate;

    // 이날 기준 연속 출석 일수. 1부터 시작.
    @Column(nullable = false)
    private Integer streakCount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StreakBonus bonusAwarded = StreakBonus.NONE;

    public void updateBonus(StreakBonus bonus) {
        this.bonusAwarded = bonus;
    }
}
