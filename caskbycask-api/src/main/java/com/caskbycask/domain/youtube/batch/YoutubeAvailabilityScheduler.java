package com.caskbycask.domain.youtube.batch;

import com.caskbycask.domain.youtube.service.YoutubeAvailabilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 삭제·비공개된 영상을 갤러리에서 내리는 정기 점검.
 * <p>
 * 기본 매일 새벽 4시 40분이다. 수집(3시간마다)과 같은 단일 스레드 스케줄러를 쓰므로 둘이
 * 겹쳐 돌지 않는다 — 같은 채널·영상을 동시에 건드리지 않게 하려는 것이다.
 * <p>
 * 한 번에 확인하는 수는 {@code youtube.availability.max-per-run} 으로 제한되며,
 * 오래 확인 안 한 영상부터 순번대로 돌아간다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class YoutubeAvailabilityScheduler {

    private final YoutubeAvailabilityService youtubeAvailabilityService;

    @Scheduled(
            cron = "${youtube.availability.cron:0 40 4 * * *}",
            zone = "Asia/Seoul",
            scheduler = "youtubeSyncTaskScheduler")
    public void sweep() {
        try {
            youtubeAvailabilityService.sweep();
        } catch (RuntimeException e) {
            log.error("유튜브 영상 가용성 점검이 중단되었습니다", e);
        }
    }
}
