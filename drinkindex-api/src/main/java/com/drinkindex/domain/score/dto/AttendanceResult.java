package com.drinkindex.domain.score.dto;

import com.drinkindex.domain.score.entity.enums.StreakBonus;
import lombok.Builder;

@Builder
public record AttendanceResult(
        boolean alreadyChecked,
        boolean isFirst,
        int streakCount,
        StreakBonus bonusAwarded,
        int totalMaturingPower
) {
    public static AttendanceResult ofAlreadyChecked() {
        return AttendanceResult.builder()
                .alreadyChecked(true)
                .isFirst(false)
                .streakCount(0)
                .bonusAwarded(StreakBonus.NONE)
                .totalMaturingPower(0)
                .build();
    }
}
