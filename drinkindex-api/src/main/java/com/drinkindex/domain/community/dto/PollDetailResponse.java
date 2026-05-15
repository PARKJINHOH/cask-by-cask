package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Poll;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class PollDetailResponse {

    private final Long id;
    private final String question;
    private final boolean isMultipleChoice;
    private final LocalDateTime endsAt;
    private final boolean isExpired;
    private final List<PollOptionInfo> options;
    private final int totalVotes;

    private PollDetailResponse(Poll poll) {
        this.id               = poll.getId();
        this.question         = poll.getQuestion();
        this.isMultipleChoice = Boolean.TRUE.equals(poll.getIsMultipleChoice());
        this.endsAt           = poll.getEndsAt();
        this.isExpired        = poll.isExpired();
        this.options          = poll.getOptions().stream()
                                    .map(PollOptionInfo::from)
                                    .collect(Collectors.toList());
        this.totalVotes       = this.options.stream().mapToInt(PollOptionInfo::getVoteCount).sum();
    }

    public static PollDetailResponse from(Poll poll) {
        return new PollDetailResponse(poll);
    }
}
