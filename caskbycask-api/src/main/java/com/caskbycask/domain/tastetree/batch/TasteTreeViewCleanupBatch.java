package com.caskbycask.domain.tastetree.batch;

import com.caskbycask.domain.tastetree.service.TasteTreeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TasteTreeViewCleanupBatch {
    private final TasteTreeService service;

    @Scheduled(cron = "0 20 4 * * *", zone = "Asia/Seoul")
    public void cleanup() {
        int deleted = service.cleanupOldViews();
        if (deleted > 0) log.info("Old taste tree daily views deleted: {}", deleted);
    }
}
