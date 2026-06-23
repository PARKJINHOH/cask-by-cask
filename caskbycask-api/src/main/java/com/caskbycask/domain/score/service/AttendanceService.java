package com.caskbycask.domain.score.service;

import com.caskbycask.domain.score.dto.AttendanceResult;
import com.caskbycask.domain.score.entity.AttendanceLog;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.entity.enums.StreakBonus;
import com.caskbycask.domain.score.repository.AttendanceLogRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceLogRepository attendanceLogRepository;
    private final UserRepository userRepository;
    private final ScoreService scoreService;

    @Transactional(readOnly = true)
    public boolean isAttendedToday(Long userId) {
        return attendanceLogRepository.existsByUserIdAndAttendanceDate(userId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<LocalDate> getAttendanceHistoryInLastYear(Long userId) {
        LocalDate oneYearAgo = LocalDate.now().minusYears(1);
        return attendanceLogRepository.findAllByUserIdAndAttendanceDateGreaterThanEqual(userId, oneYearAgo)
                .stream()
                .map(AttendanceLog::getAttendanceDate)
                .toList();
    }

    @Transactional
    public AttendanceResult checkAttendance(Long userId) {
        LocalDate today = LocalDate.now();

        if (attendanceLogRepository.existsByUserIdAndAttendanceDate(userId, today)) {
            return AttendanceResult.ofAlreadyChecked();
        }

        User user = userRepository.getByIdOrThrow(userId);

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
