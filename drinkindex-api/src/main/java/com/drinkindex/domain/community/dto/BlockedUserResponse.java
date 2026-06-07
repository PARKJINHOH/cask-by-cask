package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.UserBlock;
import com.drinkindex.domain.user.entity.User;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BlockedUserResponse {

    private final Long userId;
    private final String nickname;
    private final String role;
    private final Integer currentLevel;
    private final Integer maturingPower;
    private final Boolean nicknameFixed;
    private final String profileImageUrl;
    private final LocalDateTime blockedAt;

    private BlockedUserResponse(UserBlock block) {
        User u = block.getBlocked();
        this.userId          = u.getId();
        this.nickname        = u.getNickname();
        this.role            = u.getRole().name();
        this.currentLevel    = u.getCurrentLevel();
        this.maturingPower   = u.getMaturingPower();
        this.nicknameFixed   = u.getNicknameFixed();
        this.profileImageUrl = u.getProfileImageUrl();
        this.blockedAt       = block.getCreatedAt();
    }

    public static BlockedUserResponse from(UserBlock block) {
        return new BlockedUserResponse(block);
    }
}
