package com.drinkindex.global.response;

import lombok.Getter;

import java.util.List;

@Getter
public class BadWordErrorResponse {

    private final boolean success = false;
    private final String code = "BAD_WORD_DETECTED";
    private final String message = "욕설이 포함되어 있습니다";
    private final List<String> detectedWords;

    private BadWordErrorResponse(List<String> detectedWords) {
        this.detectedWords = detectedWords;
    }

    public static BadWordErrorResponse of(List<String> detectedWords) {
        return new BadWordErrorResponse(detectedWords);
    }
}
