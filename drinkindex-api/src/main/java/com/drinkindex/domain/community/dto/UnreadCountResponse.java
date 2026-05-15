package com.drinkindex.domain.community.dto;

import lombok.Getter;

@Getter
public class UnreadCountResponse {

    private final long count;

    public UnreadCountResponse(long count) {
        this.count = count;
    }
}
