package com.drinkindex.admin.service;

import com.drinkindex.domain.score.dto.*;
import com.drinkindex.domain.score.entity.MemberLevelConfig;
import com.drinkindex.domain.score.entity.ScoreConfig;
import com.drinkindex.domain.score.repository.MemberLevelConfigRepository;
import com.drinkindex.domain.score.repository.ScoreConfigRepository;
import com.drinkindex.domain.score.repository.ScoreHistoryRepository;
import com.drinkindex.domain.score.service.ScoreService;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminScoreService {

    private final ScoreConfigRepository scoreConfigRepository;
    private final MemberLevelConfigRepository memberLevelConfigRepository;
    private final ScoreHistoryRepository scoreHistoryRepository;
    private final ScoreService scoreService;

    // ─── 점수 설정 ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ScoreConfigResponse> getAllScoreConfigs() {
        return scoreConfigRepository.findAllByOrderByActionTypeAsc()
                .stream()
                .map(ScoreConfigResponse::from)
                .toList();
    }

    @Transactional
    public ScoreConfigResponse createScoreConfig(CreateScoreConfigRequest request) {
        String actionType = request.actionType().trim();
        if (scoreConfigRepository.existsByActionType(actionType)) {
            throw new CustomException(ErrorCode.SCORE_CONFIG_DUPLICATE);
        }
        ScoreConfig config = ScoreConfig.builder()
                .actionType(actionType)
                .score(request.score())
                .dailyLimit(request.dailyLimit())
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .description(request.description())
                .build();
        return ScoreConfigResponse.from(scoreConfigRepository.save(config));
    }

    @Transactional
    public ScoreConfigResponse updateScoreConfig(Long id, UpdateScoreConfigRequest request) {
        ScoreConfig config = scoreConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SCORE_CONFIG_NOT_FOUND));
        if (request.actionType() != null && !request.actionType().isBlank()
                && !request.actionType().trim().equals(config.getActionType())
                && scoreConfigRepository.existsByActionType(request.actionType().trim())) {
            throw new CustomException(ErrorCode.SCORE_CONFIG_DUPLICATE);
        }
        config.update(request.actionType(), request.score(), request.dailyLimit(), request.isActive(), request.description());
        return ScoreConfigResponse.from(config);
    }

    @Transactional
    public void deleteScoreConfig(Long id) {
        ScoreConfig config = scoreConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SCORE_CONFIG_NOT_FOUND));
        scoreConfigRepository.delete(config);
    }

    // ─── 레벨 설정 ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LevelConfigResponse> getAllLevelConfigs() {
        return memberLevelConfigRepository.findAllByOrderByLevelAsc()
                .stream()
                .map(LevelConfigResponse::from)
                .toList();
    }

    @Transactional
    public LevelConfigResponse createLevelConfig(CreateLevelConfigRequest request) {
        if (memberLevelConfigRepository.existsByLevel(request.level())) {
            throw new CustomException(ErrorCode.CONSTRAINT_VIOLATION);
        }
        MemberLevelConfig config = MemberLevelConfig.builder()
                .level(request.level())
                .name(request.name())
                .minScore(request.minScore())
                .build();
        return LevelConfigResponse.from(memberLevelConfigRepository.save(config));
    }

    @Transactional
    public LevelConfigResponse updateLevelConfig(Long id, UpdateLevelConfigRequest request) {
        MemberLevelConfig config = memberLevelConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.LEVEL_CONFIG_NOT_FOUND));
        config.update(request.name(), request.minScore(), request.isActive());
        return LevelConfigResponse.from(config);
    }

    @Transactional
    public void deleteLevelConfig(Long id) {
        MemberLevelConfig config = memberLevelConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.LEVEL_CONFIG_NOT_FOUND));
        if (config.getLevel() == 1) {
            throw new CustomException(ErrorCode.CANNOT_DELETE_BASE_LEVEL);
        }
        memberLevelConfigRepository.delete(config);
    }

    /**
     * 공식 자동생성 — 기존 레벨 구간 전체를 지우고 baseScore/growthRate 곡선으로 1~maxLevel 재생성.
     * 이름은 "N레벨", 임계값은 단조 증가 보장. 생성 후 전체 회원 레벨을 재계산한다.
     * (프론트 generateLevels 와 동일 공식)
     */
    @Transactional
    public List<LevelConfigResponse> generateLevelConfigs(GenerateLevelConfigRequest request) {
        int maxLevel = request.maxLevel();
        int baseScore = request.baseScore();
        double growth = request.growthRate();

        memberLevelConfigRepository.deleteAllInBatch();

        long prev = -1;
        List<MemberLevelConfig> configs = new java.util.ArrayList<>(maxLevel);
        for (int level = 1; level <= maxLevel; level++) {
            double raw = level == 1 ? 0 : baseScore * (Math.pow(growth, level - 1) - 1);
            long minScore = niceRound(raw);
            if (minScore <= prev) {
                minScore = prev + (prev < 100 ? 5 : prev < 1000 ? 10 : prev < 10000 ? 100 : 1000);
            }
            prev = minScore;
            configs.add(MemberLevelConfig.builder()
                    .level(level)
                    .name(level + "레벨")
                    .minScore((int) Math.min(minScore, Integer.MAX_VALUE))
                    .isActive(true)
                    .build());
        }
        memberLevelConfigRepository.saveAll(configs);

        // 구간이 바뀌었으니 전체 회원 currentLevel 재계산
        scoreService.recalculateAllMemberLevels();

        return memberLevelConfigRepository.findAllByOrderByLevelAsc()
                .stream()
                .map(LevelConfigResponse::from)
                .toList();
    }

    /** 읽기 좋은 자리수로 반올림 (프론트 niceRound 와 동일) */
    private long niceRound(double v) {
        if (v <= 0) return 0;
        long step = v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 100 : v < 100000 ? 1000 : v < 1000000 ? 10000 : 50000;
        return Math.round(v / step) * step;
    }

    // [패치 11] 레벨 구간 변경 후 전체 회원 재계산 (수동 실행)
    @Transactional
    public int recalculateAllLevels() {
        return scoreService.recalculateAllMemberLevels();
    }

    // ─── 점수 이력 ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ScoreHistoryResponse> getScoreHistory(Long userId, int page, int size) {
        return scoreHistoryRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(ScoreHistoryResponse::from);
    }

    // ─── 관리자 수동 조정 ────────────────────────────────────────────────────

    @Transactional
    public void adminAdjust(AdminAdjustRequest request, Long adminId) {
        scoreService.adminAdjust(request.targetUserId(), request.amount(), request.description(), adminId);
    }
}
