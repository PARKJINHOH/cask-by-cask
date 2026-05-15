package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.PollOption;
import lombok.Getter;

@Getter
public class PollOptionResponse {

    private final Long id;
    private final String optionText;
    private final int voteCount;
    private final int sortOrder;

    private PollOptionResponse(PollOption option) {
        this.id         = option.getId();
        this.optionText = option.getOptionText();
        this.voteCount  = option.getVoteCount();
        this.sortOrder  = option.getSortOrder();
    }

    public static PollOptionResponse from(PollOption option) {
        return new PollOptionResponse(option);
    }
}
