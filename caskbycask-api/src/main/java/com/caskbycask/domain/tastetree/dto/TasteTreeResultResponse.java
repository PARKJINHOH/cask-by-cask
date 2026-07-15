package com.caskbycask.domain.tastetree.dto;

import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;

import java.time.LocalDateTime;
import java.util.List;

public record TasteTreeResultResponse(
        Long id,
        String shareKey,
        Long treeId,
        String treeShareKey,
        TasteTreeType treeType,
        String treeTitle,
        String treeDescription,
        String resultTitleKo,
        String resultTitleEn,
        String ownerNickname,
        Long versionId,
        Integer versionNumber,
        boolean latestVersion,
        TasteTreeContent content,
        List<TasteTreePathSnapshot> path,
        List<TasteTreeResultItemSnapshot> items,
        LocalDateTime createdAt
) {}
