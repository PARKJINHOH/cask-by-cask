package com.caskbycask.domain.score.dto;

import com.caskbycask.domain.score.entity.MemberLevelConfig;

import java.time.LocalDateTime;

public record LevelConfigResponse(
        Long id,
        Integer level,
        String name,
        Integer minScore,
        Boolean isActive,
        LocalDateTime updatedAt
) {
    public static LevelConfigResponse from(MemberLevelConfig config) {
        return new LevelConfigResponse(
                config.getId(),
                config.getLevel(),
                config.getName(),
                config.getMinScore(),
                config.getIsActive(),
                config.getUpdatedAt()
        );
    }
}
