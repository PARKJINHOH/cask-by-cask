package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Poll;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class PollResponse {

    private final Long id;
    private final String question;
    private final boolean isMultipleChoice;
    private final LocalDateTime endsAt;
    private final boolean isEnded;
    private final int totalVotes;
    private final List<PollOptionResponse> options;
    private final List<Long> myVotedOptionIds; // null if not logged in / not voted

    private PollResponse(Poll poll, List<Long> myVotedOptionIds) {
        this.id               = poll.getId();
        this.question         = poll.getQuestion();
        this.isMultipleChoice = Boolean.TRUE.equals(poll.getIsMultipleChoice());
        this.endsAt           = poll.getEndsAt();
        this.isEnded          = poll.isExpired();
        this.options          = poll.getOptions().stream()
                                    .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                                    .map(PollOptionResponse::from)
                                    .collect(Collectors.toList());
        this.totalVotes       = this.options.stream().mapToInt(PollOptionResponse::getVoteCount).sum();
        this.myVotedOptionIds = myVotedOptionIds;
    }

    public static PollResponse of(Poll poll, List<Long> myVotedOptionIds) {
        return new PollResponse(poll, myVotedOptionIds);
    }
}
