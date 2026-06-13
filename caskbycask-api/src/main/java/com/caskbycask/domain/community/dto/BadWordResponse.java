package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.BadWord;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BadWordResponse {

    private final Long id;
    private final String word;
    private final Boolean isActive;
    private final LocalDateTime createdAt;

    private BadWordResponse(BadWord badWord) {
        this.id        = badWord.getId();
        this.word      = badWord.getWord();
        this.isActive  = badWord.getIsActive();
        this.createdAt = badWord.getCreatedAt();
    }

    public static BadWordResponse from(BadWord badWord) {
        return new BadWordResponse(badWord);
    }
}
