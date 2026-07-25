package com.caskbycask.domain.pricetracker.entity.enums;

public enum PriceCurrency {
    KRW, TWD, USD, JPY, CNY, EUR;

    public boolean isForeignCurrency() {
        return this != KRW;
    }
}
