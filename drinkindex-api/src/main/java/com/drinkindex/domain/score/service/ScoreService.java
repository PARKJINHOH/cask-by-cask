package com.drinkindex.domain.score.service;

import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.service.NotificationService;
import com.drinkindex.domain.score.entity.MemberLevelConfig;
import com.drinkindex.domain.score.entity.ScoreConfig;
import com.drinkindex.domain.score.entity.ScoreHistory;
import com.drinkindex.domain.score.entity.enums.ScoreActionType;
import com.drinkindex.domain.score.repository.MemberLevelConfigRepository;
import com.drinkindex.domain.score.repository.ScoreConfigRepository;
import com.drinkindex.domain.score.repository.ScoreHistoryRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ScoreService {

    private final ScoreConfigRepository scoreConfigRepository;
    private final MemberLevelConfigRepository memberLevelConfigRepository;
    private final ScoreHistoryRepository scoreHistoryRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public void award(Long userId, ScoreActionType actionType, String referenceType, Long referenceId) {
        applyScore(userId, actionType, referenceType, referenceId, null);
    }

    @Transactional
    public void deduct(Long userId, ScoreActionType actionType, String referenceType, Long referenceId) {
        applyScore(userId, actionType, referenceType, referenceId, null);
    }

    @Transactional
    public void adminAdjust(Long targetUserId, Integer amount, String description, Long adminId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.addMaturingPower(amount);

        checkAndApplyLevelUp(user);

        ScoreHistory history = ScoreHistory.builder()
                .user(user)
                .actionType(ScoreActionType.ADMIN_ADJUST)
                .score(amount)
                .balanceAfter(user.getMaturingPower())
                .description(description)
                .build();
        scoreHistoryRepository.save(history);
    }

    private void applyScore(Long userId, ScoreActionType actionType,
                            String referenceType, Long referenceId, String customDescription) {
        // config가 없으면 스킵 (미등록 액션 = 점수 미부여, 로그인 등 핵심 흐름 중단 방지)
        ScoreConfig config = scoreConfigRepository.findByActionType(actionType).orElse(null);
        if (config == null || !config.getIsActive()) return;

        int actualScore = config.getScore();

        if (config.getDailyLimit() != null && actualScore > 0) {
            Integer todaySum = scoreHistoryRepository.sumTodayScoreByUserAndAction(
                    userId, actionType, LocalDate.now());
            int remaining = config.getDailyLimit() - todaySum;
            if (remaining <= 0) return;
            actualScore = Math.min(actualScore, remaining);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.addMaturingPower(actualScore);

        checkAndApplyLevelUp(user);

        String description = customDescription != null
                ? customDescription
                : buildDescription(actionType, actualScore);

        ScoreHistory history = ScoreHistory.builder()
                .user(user)
                .actionType(actionType)
                .score(actualScore)
                .balanceAfter(user.getMaturingPower())
                .referenceType(referenceType)
                .referenceId(referenceId)
                .description(description)
                .build();
        scoreHistoryRepository.save(history);
    }

    private void checkAndApplyLevelUp(User user) {
        int newLevel = calculateLevel(user.getMaturingPower());
        if (newLevel != user.getCurrentLevel()) {
            String levelName = getLevelName(newLevel);
            user.updateLevel(newLevel);
            notificationService.send(
                    user,
                    NotificationType.SYSTEM,
                    "Lv." + newLevel + " " + levelName + "으로 레벨업!",
                    "LEVEL_UP",
                    null
            );
        }
    }

    private int calculateLevel(int maturingPower) {
        return memberLevelConfigRepository
                .findAllByIsActiveTrueOrderByMinScoreDesc()
                .stream()
                .filter(config -> maturingPower >= config.getMinScore())
                .findFirst()
                .map(MemberLevelConfig::getLevel)
                .orElse(1);
    }

    private String getLevelName(int level) {
        return memberLevelConfigRepository.findAllByIsActiveTrueOrderByMinScoreDesc()
                .stream()
                .filter(c -> c.getLevel() == level)
                .findFirst()
                .map(MemberLevelConfig::getName)
                .orElse("Lv." + level);
    }

    private String buildDescription(ScoreActionType actionType, int actualScore) {
        String action = switch (actionType) {
            case POST_WRITE_GENERAL -> "자유게시판 일반 글쓰기";
            case POST_WRITE_QUESTION -> "자유게시판 질문 글쓰기";
            case POST_WRITE_REVIEW -> "자유게시판 리뷰 글쓰기";
            case POST_WRITE_SHARING -> "자유게시판 나눔 글쓰기";
            case POST_WRITE_DISTILLERY_TOUR -> "자유게시판 증류소투어 글쓰기";
            case POST_WRITE_NOTICE -> "소식 게시판 글쓰기";
            case POST_DELETE -> "게시글 삭제";
            case POST_LOCKED -> "신고 잠금";
            case POST_LIKED -> "추천 받음";
            case COMMENT_WRITE -> "댓글 작성";
            case SPIRIT_REVIEW_WRITE -> "술 상세 리뷰 작성";
            case SPIRIT_REQUEST -> "술 등록 요청";
            case SPIRIT_REQUEST_APPROVED -> "술 등록 승인";
            case WISHLIST_ADD -> "위시리스트 추가";
            case ATTENDANCE -> "출석 체크";
            case ATTENDANCE_STREAK_7 -> "7일 연속 출석 보너스";
            case ATTENDANCE_STREAK_30 -> "30일 연속 출석 보너스";
            case ADMIN_ADJUST -> "관리자 조정";
        };
        String sign = actualScore >= 0 ? "+" : "";
        return action + " " + sign + actualScore;
    }
}
