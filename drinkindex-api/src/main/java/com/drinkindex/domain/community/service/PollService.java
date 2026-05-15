package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.PollOptionResponse;
import com.drinkindex.domain.community.dto.PollResponse;
import com.drinkindex.domain.community.dto.VoteRequest;
import com.drinkindex.domain.community.entity.Poll;
import com.drinkindex.domain.community.entity.PollOption;
import com.drinkindex.domain.community.entity.PollVote;
import com.drinkindex.domain.community.repository.PollOptionRepository;
import com.drinkindex.domain.community.repository.PollRepository;
import com.drinkindex.domain.community.repository.PollVoteRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PollService {

    private final PollRepository pollRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PollResponse getPoll(Long pollId, Long userId) {
        Poll poll = findPoll(pollId);

        List<Long> myVotedOptionIds = null;
        if (userId != null) {
            myVotedOptionIds = pollVoteRepository.findByPollIdAndUserId(pollId, userId).stream()
                    .map(pv -> pv.getOption().getId())
                    .collect(Collectors.toList());
        }

        return PollResponse.of(poll, myVotedOptionIds);
    }

    @Transactional
    public PollResponse vote(Long pollId, VoteRequest request, Long userId) {
        Poll poll = findPoll(pollId);

        // 1. 종료 검증
        if (poll.isExpired()) {
            throw new CustomException(ErrorCode.POLL_ENDED);
        }

        // 2. 중복 투표 검증
        if (pollVoteRepository.existsByPollIdAndUserId(pollId, userId)) {
            throw new CustomException(ErrorCode.ALREADY_VOTED);
        }

        // 3. 단일 선택 검증
        if (!Boolean.TRUE.equals(poll.getIsMultipleChoice()) && request.getOptionIds().size() != 1) {
            throw new CustomException(ErrorCode.INVALID_VOTE);
        }

        // 4. 옵션 소속 확인
        Set<Long> validOptionIds = poll.getOptions().stream()
                .map(PollOption::getId)
                .collect(Collectors.toSet());

        boolean allValid = request.getOptionIds().stream().allMatch(validOptionIds::contains);
        if (!allValid) {
            throw new CustomException(ErrorCode.INVALID_VOTE);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 5. 투표 저장 + voteCount 증가
        for (Long optionId : request.getOptionIds()) {
            PollOption option = pollOptionRepository.findById(optionId)
                    .orElseThrow(() -> new CustomException(ErrorCode.POLL_OPTION_NOT_FOUND));

            PollVote vote = PollVote.builder()
                    .poll(poll).option(option).user(user).build();
            pollVoteRepository.save(vote);
            pollOptionRepository.incrementVoteCount(optionId);
        }

        // 응답: 최신 voteCount 반영을 위해 재조회
        Poll refreshed = findPoll(pollId);
        return PollResponse.of(refreshed, request.getOptionIds());
    }

    private Poll findPoll(Long pollId) {
        return pollRepository.findById(pollId)
                .orElseThrow(() -> new CustomException(ErrorCode.POLL_NOT_FOUND));
    }
}
