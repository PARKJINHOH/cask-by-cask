package com.caskbycask.global.exception;

import lombok.Getter;

import java.util.List;

@Getter
public class BadWordDetectedException extends RuntimeException {

    private final List<String> detectedWords;

    public BadWordDetectedException(List<String> detectedWords) {
        super("욕설이 포함되어 있습니다");
        this.detectedWords = detectedWords;
    }
}
