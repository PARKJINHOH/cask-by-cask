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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

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

    /**
     * [패치 1] 특정 reference로 "원래 지급된 점수만큼"만 정확히 차감.
     * 고정값(-5)이 아니라 score_history에 기록된 실제 지급액을 추적해 차감하므로,
     * 작성 시 익명(0점)·관리자(미집계)였다면 차감할 것도 없어 자동으로 스킵된다.
     * (삭제 후 재작성 파밍 차단 — 지급=차감으로 net 0 보장)
     */
    @Transactional
    public void deductByReference(Long userId, String originalAction,
                                  String referenceType, Long referenceId) {
        User user = userRepository.getByIdOrThrow(userId);

        // [패치 3] MEMBER만 레벨 집계 대상 — 관리자·증류소는 차감도 스킵
        if (!isScoreEligible(user)) return;

        Integer awarded = scoreHistoryRepository.sumAwardedScoreByReference(
                userId, originalAction, referenceType, referenceId);
        if (awarded == null || awarded <= 0) return; // 지급된 적 없으면 차감 없음

        user.addMaturingPower(-awarded);
        checkAndApplyLevelUp(user);

        // [패치 1] 차감 이력 기록 (음수) — 동일 reference 추적 유지
        ScoreHistory history = ScoreHistory.builder()
                .user(user)
                .actionType(originalAction)
                .score(-awarded)
                .balanceAfter(user.getMaturingPower())
                .referenceType(referenceType)
                .referenceId(referenceId)
                .description("삭제로 인한 점수 회수 -" + awarded)
                .build();
        scoreHistoryRepository.save(history);
    }

    @Transactional
    public void adminAdjust(Long targetUserId, Integer amount, String description, Long adminId) {
        User user = userRepository.getByIdOrThrow(targetUserId);

        // [패치 3] 관리자·증류소 담당자는 레벨 미집계 — 수동 조정 대상에서도 제외
        if (!isScoreEligible(user)) return;

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

        User user = userRepository.getByIdOrThrow(userId);

        // [패치 3] MEMBER만 레벨 집계 대상 — SUPER_ADMIN·ADMIN·MODERATOR·증류소(PARTNER) 적립/차감 모두 스킵
        if (!isScoreEligible(user)) return;

        int actualScore = config.getScore();

        // [패치 1] 동일 reference 재지급 방지 (referenceId가 있는 1회성 액션에만 적용).
        // ATTENDANCE 등 referenceId=null 반복성 액션은 기존 날짜 기반 중복 방지 로직 유지.
        if (actualScore > 0 && referenceId != null
                && scoreHistoryRepository
                    .existsByUserIdAndActionTypeAndReferenceTypeAndReferenceIdAndScoreGreaterThan(
                        userId, actionType, referenceType, referenceId, 0)) {
            return;
        }

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

    // [패치 3] MEMBER만 점수·레벨·랭킹 집계 대상.
    // 관리자(SUPER_ADMIN/ADMIN/MODERATOR)·증류소 담당자(PARTNER)는 제외 → 고정 아이콘 표시.
    private boolean isScoreEligible(User user) {
        return user.getRole() == Role.MEMBER;
    }

    /**
     * [패치 11] 레벨 구간 변경 후 전체 MEMBER의 currentLevel 재계산.
     * 대량 처리를 위해 페이징하며, 레벨 변동 회원에게는 알림을 보내지 않는다(관리자 조정이므로).
     * @return 레벨이 실제로 변경된 회원 수
     */
    @Transactional
    public int recalculateAllMemberLevels() {
        // 레벨 구간을 한 번만 로드 (회원마다 재조회 방지) — minScore 내림차순
        List<MemberLevelConfig> levels = memberLevelConfigRepository
                .findAllByIsActiveTrueOrderByMinScoreDesc();

        int pageSize = 500;
        int changed = 0;
        int pageIndex = 0;
        Page<User> page;
        do {
            page = userRepository.findByRole(Role.MEMBER, PageRequest.of(pageIndex, pageSize));
            for (User user : page.getContent()) {
                int newLevel = resolveLevel(levels, user.getMaturingPower());
                if (newLevel != user.getCurrentLevel()) {
                    user.updateLevel(newLevel); // 알림 미발송
                    changed++;
                }
            }
            pageIndex++;
        } while (page.hasNext());

        return changed;
    }

    // [패치 11] 미리 로드한 레벨 구간 목록으로 레벨 계산 (배치용)
    private int resolveLevel(List<MemberLevelConfig> levelsDesc, int maturingPower) {
        return levelsDesc.stream()
                .filter(config -> maturingPower >= config.getMinScore())
                .findFirst()
                .map(MemberLevelConfig::getLevel)
                .orElse(1);
    }

    private void checkAndApplyLevelUp(User user) {
        // [패치 3] 관리자·증류소는 currentLevel 갱신 안 함
        if (!isScoreEligible(user)) return;
        int newLevel = calculateLevel(user.getMaturingPower());
        if (newLevel != user.getCurrentLevel()) {
            boolean levelUp = newLevel > user.getCurrentLevel();
            user.updateLevel(newLevel);
            if (levelUp) {
                notificationService.send(
                        user,
                        NotificationType.SYSTEM,
                        "Lv." + newLevel + " 달성! 레벨업 🎉",
                        "LEVEL_UP",
                        null
                );
            }
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
