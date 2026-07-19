package com.caskbycask.domain.tastetree.dto;

public record TasteTreeEngagementResponse(
        boolean liked,
        int likeCount,
        int viewCount
) {}
