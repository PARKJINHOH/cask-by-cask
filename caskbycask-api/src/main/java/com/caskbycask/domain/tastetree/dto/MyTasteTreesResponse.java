package com.caskbycask.domain.tastetree.dto;

import java.util.List;

public record MyTasteTreesResponse(
        List<TasteTreeSummaryResponse> created,
        List<TasteTreeSummaryResponse> saved
) {}
