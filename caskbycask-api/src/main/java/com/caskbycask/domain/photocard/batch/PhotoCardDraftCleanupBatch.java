package com.caskbycask.domain.photocard.batch;

import com.caskbycask.domain.photocard.service.PhotoCardDraftService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 보관 기간이 지난 포토카드 임시저장 정리 — 행과 사진 파일을 함께 지운다.
 * <p>
 * 하루 한 번이면 충분하다. 사용자에게 보이는 목록은 이미 만료된 것을 빼고 주므로
 * (PhotoCardDraftService), 이 배치는 실제 저장 공간을 돌려받는 일만 한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PhotoCardDraftCleanupBatch {

    private final PhotoCardDraftService draftService;

    @Scheduled(cron = "0 40 4 * * *")
    public void cleanup() {
        int deleted = draftService.cleanupExpired();
        if (deleted > 0) {
            log.info("만료된 포토카드 임시저장 정리: {}건", deleted);
        }
    }
}
