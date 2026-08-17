package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.youtube.client.YoutubeFeedClient;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.VideoAvailability;
import com.caskbycask.domain.youtube.repository.YoutubeVideoRepository;
import com.caskbycask.domain.youtube.service.YoutubeAvailabilityWriter.Outcome;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * 삭제·비공개된 영상을 갤러리에서 내린다.
 * <p>
 * <b>왜 따로 필요한가</b> — 채널 RSS 는 최신 15편만 담아 그보다 오래된 영상이 지워졌는지
 * 알려 주지 않는다. 그래서 정기 수집만으로는 죽은 영상이 목록에 계속 남아, 눌러 보면
 * "동영상을 재생할 수 없음"이 뜬다. 시간이 갈수록 그런 카드가 쌓인다.
 * <p>
 * <b>안전 규칙</b> — 확인에 실패한 영상은 <b>건드리지 않는다</b>. 유튜브가 잠깐 느리거나
 * 요청이 몰려 429 가 오는 것과 영상이 지워진 것은 다르다. 잘못 내리면 멀쩡한 영상이 사라진다.
 * <p>
 * 한 번에 상한만큼만 확인하고 <b>오래 확인 안 한 것부터</b> 가져간다. 영상이 늘어도 실행 시간이
 * 길어지지 않고 전체가 순번대로 돌아간다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YoutubeAvailabilityService {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final YoutubeVideoRepository videoRepository;
    private final YoutubeFeedClient feedClient;
    private final YoutubeAvailabilityWriter availabilityWriter;

    /** 한 번에 확인할 영상 수 상한. */
    @Value("${youtube.availability.max-per-run:300}")
    private int maxPerRun;

    /**
     * 요청 사이 간격(ms). 공개 엔드포인트를 연달아 두드리지 않기 위한 것으로,
     * 0 이면 쉬지 않는다(테스트용).
     */
    @Value("${youtube.availability.delay-ms:150}")
    private long delayMs;

    /** 점검 결과 요약. */
    public record SweepResult(int checked, int hidden, int restored, int skipped) {
    }

    /**
     * 점검 실행. 네트워크 호출은 트랜잭션 밖에서 하고, 반영은 영상 단위 짧은 트랜잭션으로 나눈다
     * — 수백 건을 한 트랜잭션에 묶으면 그동안 커넥션을 붙들고 있게 된다.
     */
    public SweepResult sweep() {
        List<Target> targets = loadTargets();
        if (targets.isEmpty()) return new SweepResult(0, 0, 0, 0);

        LocalDateTime now = LocalDateTime.now(SERVICE_ZONE);
        int hidden = 0;
        int restored = 0;
        int skipped = 0;

        for (int index = 0; index < targets.size(); index++) {
            Target target = targets.get(index);
            if (index > 0) pause();

            VideoAvailability availability = feedClient.checkAvailability(target.videoKey());
            Outcome outcome = availabilityWriter.apply(target.id(), availability, now);
            switch (outcome) {
                case HIDDEN -> hidden++;
                case RESTORED -> restored++;
                case SKIPPED -> skipped++;
                case UNCHANGED -> { }
            }
        }

        log.info("유튜브 영상 가용성 점검 완료: 확인={}, 자동숨김={}, 복구={}, 보류={}",
                targets.size(), hidden, restored, skipped);
        return new SweepResult(targets.size(), hidden, restored, skipped);
    }

    /** 네트워크를 타기 전에 필요한 값만 꺼내 둔다 — 엔티티를 세션 밖으로 들고 다니지 않는다. */
    private record Target(Long id, String videoKey) {
    }

    private List<Target> loadTargets() {
        return videoRepository
                .findAvailabilityCheckTargets(PageRequest.of(0, Math.max(maxPerRun, 1)))
                .stream()
                .map(video -> new Target(video.getId(), video.getVideoKey()))
                .toList();
    }

    private void pause() {
        if (delayMs <= 0) return;
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException e) {
            // 종료 신호는 삼키지 않는다 — 남은 영상은 다음 실행에서 앞순위로 온다.
            Thread.currentThread().interrupt();
            throw new IllegalStateException("유튜브 가용성 점검이 중단되었습니다", e);
        }
    }
}
