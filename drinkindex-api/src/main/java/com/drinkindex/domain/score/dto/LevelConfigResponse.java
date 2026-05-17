package com.drinkindex.domain.score.dto;

import com.drinkindex.domain.score.entity.MemberLevelConfig;

import java.time.LocalDateTime;

public record LevelConfigResponse(
        Long id,
        Integer level,
        String name,
        Integer minScore,
        String iconKey,
        Boolean isActive,
        LocalDateTime updatedAt
) {
    public static LevelConfigResponse from(MemberLevelConfig config) {
        return new LevelConfigResponse(
                config.getId(),
                config.getLevel(),
                config.getName(),
                config.getMinScore(),
                config.getIconKey(),
                config.getIsActive(),
                config.getUpdatedAt()
        );
    }
}
