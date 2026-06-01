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
        config.update(request.score(), request.dailyLimit(), request.isActive(), request.description());
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
