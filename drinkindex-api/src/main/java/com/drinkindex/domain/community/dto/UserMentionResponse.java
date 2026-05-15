package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.user.entity.User;
import lombok.Getter;

@Getter
public class UserMentionResponse {

    private final Long id;
    private final String nickname;

    private UserMentionResponse(User user) {
        this.id       = user.getId();
        this.nickname = user.getNickname();
    }

    public static UserMentionResponse from(User user) {
        return new UserMentionResponse(user);
    }
}
