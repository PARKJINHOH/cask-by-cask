package com.caskbycask.domain.nicknamebadword.dto;

import com.caskbycask.domain.nicknamebadword.entity.NicknameBadWord;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class NicknameBadWordResponse {

    private final Long id;
    private final String word;
    private final Boolean isActive;
    private final LocalDateTime createdAt;

    private NicknameBadWordResponse(NicknameBadWord badWord) {
        this.id        = badWord.getId();
        this.word      = badWord.getWord();
        this.isActive  = badWord.getIsActive();
        this.createdAt = badWord.getCreatedAt();
    }

    public static NicknameBadWordResponse from(NicknameBadWord badWord) {
        return new NicknameBadWordResponse(badWord);
    }
}
