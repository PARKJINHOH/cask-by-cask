package com.drinkindex.domain.bottlecollection.dto;

import java.util.List;

public record UserBottleListResponse(
    List<UserBottleResponse> bottles,
    BottleStatsDto stats,
    int totalPages,
    long totalElements,
    int currentPage
) {}
