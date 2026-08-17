package com.caskbycask.domain.youtube.batch;

import com.caskbycask.domain.youtube.service.YoutubeSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 등록된 채널의 새 영상을 주기적으로 따라잡는다.
 * <p>
 * 기본 3시간마다다. 유튜브 RSS 는 할당량이 없지만 채널 수 × 요청 2~3회가 매번 나가므로
 * 필요 이상으로 자주 두드리지 않는다. 급할 때는 관리자 화면의 '지금 수집'을 쓴다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class YoutubeSyncScheduler {

    private final YoutubeSyncService youtubeSyncService;

    @Scheduled(
            cron = "${youtube.sync-cron:0 25 */3 * * *}",
            zone = "Asia/Seoul",
            scheduler = "youtubeSyncTaskScheduler")
    public void sync() {
        try {
            youtubeSyncService.syncAllChannels();
        } catch (RuntimeException e) {
            // 채널별 실패는 이미 그 채널 행에 기록된다. 여기 오는 것은 그보다 바깥의 사고다.
            log.error("유튜브 갤러리 정기 수집이 중단되었습니다", e);
        }
    }
}
