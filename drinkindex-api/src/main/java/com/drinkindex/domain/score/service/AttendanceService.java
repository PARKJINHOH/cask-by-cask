package com.drinkindex.domain.score.service;

import com.drinkindex.domain.score.dto.AttendanceResult;
import com.drinkindex.domain.score.entity.AttendanceLog;
import com.drinkindex.domain.score.constant.ScoreActions;
import com.drinkindex.domain.score.entity.enums.StreakBonus;
import com.drinkindex.domain.score.repository.AttendanceLogRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceLogRepository attendanceLogRepository;
    private final UserRepository userRepository;
    private final ScoreService scoreService;

    @Transactional
    public AttendanceResult checkAttendance(Long userId) {
        LocalDate today = LocalDate.now();

        if (attendanceLogRepository.existsByUserIdAndAttendanceDate(userId, today)) {
            return AttendanceResult.ofAlreadyChecked();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        LocalDate yesterday = today.minusDays(1);
        int streakCount = yesterday.equals(user.getLastAttendanceDate())
                ? user.getConsecutiveAttendance() + 1
                : 1;

        AttendanceLog log = AttendanceLog.builder()
                .user(user)
                .attendanceDate(today)
                .streakCount(streakCount)
                .build();
        attendanceLogRepository.save(log);

        user.updateAttendance(today, streakCount);

        // 기본 출석 점수
        scoreService.award(userId, ScoreActions.ATTENDANCE, "ATTENDANCE", null);

        // 연속 출석 보너스 (30 먼저 체크 후 7 체크 — 중복 방지)
        StreakBonus bonusAwarded = StreakBonus.NONE;
        if (streakCount % 30 == 0) {
            scoreService.award(userId, ScoreActions.ATTENDANCE_STREAK_30, "ATTENDANCE", null);
            log.updateBonus(StreakBonus.STREAK_30);
            bonusAwarded = StreakBonus.STREAK_30;
        } else if (streakCount % 7 == 0) {
            scoreService.award(userId, ScoreActions.ATTENDANCE_STREAK_7, "ATTENDANCE", null);
            log.updateBonus(StreakBonus.STREAK_7);
            bonusAwarded = StreakBonus.STREAK_7;
        }

        return AttendanceResult.builder()
                .alreadyChecked(false)
                .isFirst(streakCount == 1)
                .streakCount(streakCount)
                .bonusAwarded(bonusAwarded)
                .totalMaturingPower(user.getMaturingPower())
                .build();
    }
}
