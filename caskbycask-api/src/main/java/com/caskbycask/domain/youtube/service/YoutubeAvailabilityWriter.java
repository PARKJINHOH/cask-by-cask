package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.youtube.client.YoutubeFeedClient.VideoAvailability;
import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.repository.YoutubeVideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 가용성 점검 결과를 반영하는 쓰기 전용 협력자.
 * <p>
 * {@link YoutubeAvailabilityService} 와 별도 빈인 이유는 {@link YoutubeSyncWriter} 와 같다 —
 * 자기 호출에는 {@code @Transactional} 프록시가 걸리지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class YoutubeAvailabilityWriter {

    private final YoutubeVideoRepository videoRepository;

    /** 한 영상에 대한 처리 결과. */
    public enum Outcome {
        /** 정상이고 상태 변화 없음 */
        UNCHANGED,
        /** 볼 수 없어 새로 숨김 */
        HIDDEN,
        /** 되살아나 다시 노출 */
        RESTORED,
        /** 확인 실패 — 아무 것도 하지 않음 */
        SKIPPED
    }

    /**
     * 점검 결과를 반영한다.
     * <p>
     * 규칙은 셋이다.
     * <ul>
     *   <li>볼 수 없다 + 아직 안 숨겨짐 → 자동 숨김</li>
     *   <li>정상 + 자동 숨김 상태 → 복구 (관리자가 숨긴 것은 건드리지 않는다)</li>
     *   <li>확인 실패 → 점검 시각도 남기지 않는다 — 다음 실행에서 다시 앞순위로 오게</li>
     * </ul>
     */
    @Transactional
    public Outcome apply(Long videoId, VideoAvailability availability, LocalDateTime checkedAt) {
        if (availability == VideoAvailability.UNKNOWN) return Outcome.SKIPPED;

        YoutubeVideo video = videoRepository.findById(videoId).orElse(null);
        if (video == null) return Outcome.SKIPPED;

        if (availability == VideoAvailability.AVAILABLE) {
            // 자동으로 내렸던 것만 되살린다. 관리자가 내린 영상은 그대로 둔다.
            if (Boolean.TRUE.equals(video.getAutoHidden())) {
                video.markAvailable(checkedAt);
                log.info("유튜브 영상이 다시 재생 가능해져 노출을 복구한다: videoKey={}", video.getVideoKey());
                return Outcome.RESTORED;
            }
            video.markChecked(checkedAt);
            return Outcome.UNCHANGED;
        }

        // 이미 자동 숨김 상태면 사유만 갱신하고 '새로 숨김'으로 세지 않는다.
        boolean alreadyAutoHidden = Boolean.TRUE.equals(video.getAutoHidden());
        // 관리자가 이미 숨긴 영상은 노출 상태를 바꿀 것이 없다 — 점검 시각만 남긴다.
        if (!alreadyAutoHidden && !Boolean.TRUE.equals(video.getIsVisible())) {
            video.markChecked(checkedAt);
            return Outcome.UNCHANGED;
        }

        video.markUnavailable(reasonOf(availability), checkedAt);
        if (alreadyAutoHidden) return Outcome.UNCHANGED;

        log.info("유튜브 영상을 더 볼 수 없어 자동으로 숨긴다: videoKey={}, 사유={}",
                video.getVideoKey(), availability);
        return Outcome.HIDDEN;
    }

    private String reasonOf(VideoAvailability availability) {
        return availability == VideoAvailability.GONE
                ? "유튜브에서 삭제된 영상 (자동 감지)"
                : "유튜브에서 비공개·재생 제한된 영상 (자동 감지)";
    }
}
