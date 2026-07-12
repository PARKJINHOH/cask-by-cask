package com.caskbycask.domain.tierlist.batch;

import com.caskbycask.domain.tierlist.service.TierListGuestDraftService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TierListGuestDraftCleanupBatch {

    private final TierListGuestDraftService service;

    @Scheduled(cron = "0 */5 * * * *")
    public void cleanup() {
        int deleted = service.cleanupExpired();
        if (deleted > 0) {
            log.info("Expired guest tier-list drafts deleted: {}", deleted);
        }
    }
}
