package com.caskbycask.domain.tastetree.dto;

import java.util.List;

public record TasteTreePathSnapshot(
        String nodeKey,
        String titleKo,
        String titleEn,
        List<String> selectedLabelsKo,
        List<String> selectedLabelsEn
) {}
