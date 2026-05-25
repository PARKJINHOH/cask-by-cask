package com.drinkindex.domain.faq.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum FaqCategory {
    SERVICE("DrinkIndex 이용 안내", "About DrinkIndex"),
    WHISKY("위스키", "Whisky"),
    COGNAC("꼬냑", "Cognac"),
    WINE("와인", "Wine");

    private final String labelKo;
    private final String labelEn;
}
