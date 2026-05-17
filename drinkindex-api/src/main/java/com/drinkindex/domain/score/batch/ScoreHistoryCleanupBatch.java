package com.drinkindex.domain.score.batch;

import com.drinkindex.domain.score.repository.ScoreHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScoreHistoryCleanupBatch {

    private final ScoreHistoryRepository scoreHistoryRepository;

    // 매일 새벽 4시 실행 — 90일 초과 score_history Hard Delete (attendance_logs는 영구 보존)
    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void deleteOldScoreHistory() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        int deleted = scoreHistoryRepository.deleteOlderThan(cutoff);
        log.info("점수 이력 자동 삭제 완료 — 기준일: {}, 삭제 건수: {}", cutoff, deleted);
    }
}
