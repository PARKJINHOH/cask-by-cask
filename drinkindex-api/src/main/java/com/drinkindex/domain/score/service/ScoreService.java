package com.drinkindex.domain.score.service;

import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.service.NotificationService;
import com.drinkindex.domain.score.constant.ScoreActions;
import com.drinkindex.domain.score.entity.MemberLevelConfig;
import com.drinkindex.domain.score.entity.ScoreConfig;
import com.drinkindex.domain.score.entity.ScoreHistory;
import com.drinkindex.domain.score.repository.MemberLevelConfigRepository;
import com.drinkindex.domain.score.repository.ScoreConfigRepository;
import com.drinkindex.domain.score.repository.ScoreHistoryRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
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
    public void award(Long userId, String actionType, String referenceType, Long referenceId) {
        applyScore(userId, actionType, referenceType, referenceId, null);
    }

    @Transactional
    public void deduct(Long userId, String actionType, String referenceType, Long referenceId) {
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
                .actionType(ScoreActions.ADMIN_ADJUST)
                .score(amount)
                .balanceAfter(user.getMaturingPower())
                .description(description)
                .build();
        scoreHistoryRepository.save(history);
    }

    private void applyScore(Long userId, String actionType,
                            String referenceType, Long referenceId, String customDescription) {
        // config가 없으면 스킵 (미등록 액션 = 점수 미부여, 로그인 등 핵심 흐름 중단 방지)
        ScoreConfig config = scoreConfigRepository.findByActionType(actionType).orElse(null);
        if (config == null || !config.getIsActive()) return;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // SUPER_ADMIN은 숙성력 적립 제외
        if (user.getRole() == Role.SUPER_ADMIN) return;

        int actualScore = config.getScore();

        if (config.getDailyLimit() != null && actualScore > 0) {
            Integer todaySum = scoreHistoryRepository.sumTodayScoreByUserAndAction(
                    userId, actionType, LocalDate.now());
            int remaining = config.getDailyLimit() - todaySum;
            if (remaining <= 0) return;
            actualScore = Math.min(actualScore, remaining);
        }

        user.addMaturingPower(actualScore);

        checkAndApplyLevelUp(user);

        String description = customDescription != null
                ? customDescription
                : buildDescription(config, actualScore);

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

    // 액션 키가 자유 문자열이므로, 설명은 관리자가 설정한 config.description 을 사용.
    // 설명이 비어 있으면 액션 키 자체를 노출한다.
    private String buildDescription(ScoreConfig config, int actualScore) {
        String base = (config.getDescription() != null && !config.getDescription().isBlank())
                ? config.getDescription()
                : config.getActionType();
        String sign = actualScore >= 0 ? "+" : "";
        return base + " " + sign + actualScore;
    }
}
