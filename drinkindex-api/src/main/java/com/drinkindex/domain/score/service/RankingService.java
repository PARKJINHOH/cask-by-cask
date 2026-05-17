package com.drinkindex.domain.score.service;

import com.drinkindex.domain.score.dto.MyRankResponse;
import com.drinkindex.domain.score.dto.RankingProjection;
import com.drinkindex.domain.score.dto.RankingResponse;
import com.drinkindex.domain.score.entity.enums.RankingPeriod;
import com.drinkindex.domain.score.repository.RankingRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final RankingRepository rankingRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<RankingResponse> getRanking(RankingPeriod period, int page, int size) {
        LocalDateTime weekStart = getWeekStart();
        LocalDateTime monthStart = getMonthStart();
        Pageable pageable = PageRequest.of(page, size);
        int offset = page * size;

        Page<RankingProjection> raw = switch (period) {
            case ALL     -> rankingRepository.findAllRanking(weekStart, monthStart, pageable);
            case WEEKLY  -> rankingRepository.findWeeklyRanking(weekStart, monthStart, pageable);
            case MONTHLY -> rankingRepository.findMonthlyRanking(weekStart, monthStart, pageable);
        };

        List<RankingProjection> content = raw.getContent();
        List<RankingResponse> result = new ArrayList<>(content.size());
        for (int i = 0; i < content.size(); i++) {
            result.add(RankingResponse.of(offset + i + 1, content.get(i)));
        }
        return new PageImpl<>(result, pageable, raw.getTotalElements());
    }

    @Transactional(readOnly = true)
    public MyRankResponse getMyRank(Long userId, RankingPeriod period) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        LocalDateTime weekStart = getWeekStart();
        LocalDateTime monthStart = getMonthStart();

        return switch (period) {
            case ALL -> {
                int rank = (int) rankingRepository.countAboveByMaturingPower(user.getMaturingPower()) + 1;
                yield new MyRankResponse(rank, userId, user.getNickname(),
                        user.getCurrentLevel(), user.getMaturingPower(), user.getMaturingPower());
            }
            case WEEKLY -> {
                long myScore = rankingRepository.getUserPeriodScore(userId, weekStart);
                int rank = (int) rankingRepository.countAboveByWeeklyScore(myScore, weekStart) + 1;
                yield new MyRankResponse(rank, userId, user.getNickname(),
                        user.getCurrentLevel(), user.getMaturingPower(), myScore);
            }
            case MONTHLY -> {
                long myScore = rankingRepository.getUserPeriodScore(userId, monthStart);
                int rank = (int) rankingRepository.countAboveByMonthlyScore(myScore, monthStart) + 1;
                yield new MyRankResponse(rank, userId, user.getNickname(),
                        user.getCurrentLevel(), user.getMaturingPower(), myScore);
            }
        };
    }

    private LocalDateTime getWeekStart() {
        return LocalDate.now().with(DayOfWeek.MONDAY).atStartOfDay();
    }

    private LocalDateTime getMonthStart() {
        return LocalDate.now().withDayOfMonth(1).atStartOfDay();
    }
}
