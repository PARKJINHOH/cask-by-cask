package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.youtube.client.YoutubeFeedClient.FeedVideo;
import com.caskbycask.domain.youtube.entity.YoutubeChannel;
import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoSource;
import com.caskbycask.domain.youtube.repository.YoutubeChannelRepository;
import com.caskbycask.domain.youtube.repository.YoutubeVideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 수집 결과를 DB 에 반영하는 쓰기 전용 협력자.
 * <p>
 * {@link YoutubeSyncService} 와 <b>별도 빈</b>인 이유는 자기 호출(self-invocation)에는
 * {@code @Transactional} 프록시가 걸리지 않기 때문이다. 같은 클래스 안의 private/protected
 * 메서드로 두면 트랜잭션 없이 실행되어 실패 시 절반만 반영된다.
 */
@Component
@RequiredArgsConstructor
public class YoutubeSyncWriter {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final YoutubeChannelRepository channelRepository;
    private final YoutubeVideoRepository videoRepository;

    /** 새 영상 수 / 갱신된 영상 수. */
    public record PersistOutcome(int created, int updated) {
    }

    @Transactional
    public PersistOutcome persistFeed(Long channelId, List<FeedVideo> feedVideos) {
        YoutubeChannel channel = channelRepository.findById(channelId).orElseThrow();

        Map<String, YoutubeVideo> existing = videoRepository
                .findByVideoKeyIn(feedVideos.stream().map(FeedVideo::videoKey).toList())
                .stream()
                .collect(Collectors.toMap(YoutubeVideo::getVideoKey, Function.identity(), (a, b) -> a));

        int created = 0;
        int updated = 0;
        Map<String, YoutubeVideo> pending = new HashMap<>();
        for (FeedVideo feed : feedVideos) {
            YoutubeVideo video = existing.get(feed.videoKey());
            if (video != null) {
                // 제목·설명·썸네일은 업로더가 나중에 고치기도 한다.
                video.applyFeedUpdate(feed.title(), feed.description(), feed.thumbnailUrl(), feed.publishedAt());
                // 자동 수집분(CHANNEL_FEED)이고 피드에서 유형이 새로 감지되었으면 동기화한다.
                if (video.getSource() == YoutubeVideoSource.CHANNEL_FEED && video.getVideoType() != feed.videoType()) {
                    video.updateVideoType(feed.videoType());
                }
                updated++;
                continue;
            }
            if (pending.containsKey(feed.videoKey())) continue;

            pending.put(feed.videoKey(), YoutubeVideo.builder()
                    .channel(channel)
                    .videoKey(feed.videoKey())
                    .title(feed.title())
                    .description(feed.description())
                    .thumbnailUrl(feed.thumbnailUrl())
                    .videoType(feed.videoType())
                    .source(YoutubeVideoSource.CHANNEL_FEED)
                    .publishedAt(feed.publishedAt())
                    // 허락받은 채널만 수집 대상이므로 건별 승인은 두지 않는다.
                    // 문제가 있는 영상만 관리자가 목록에서 숨긴다.
                    .isVisible(true)
                    .isPinned(false)
                    .build());
            created++;
        }
        if (!pending.isEmpty()) videoRepository.saveAll(pending.values());

        channel.markSynced(LocalDateTime.now(SERVICE_ZONE));
        return new PersistOutcome(created, updated);
    }

    /**
     * 실패 사유만 별도 트랜잭션으로 남긴다.
     * <p>{@code REQUIRES_NEW} 인 이유 — 호출 측 트랜잭션이 롤백되면 실패 기록까지 함께 사라져
     * 관리자 화면에는 낡은 "마지막 수집 성공"만 남는다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(Long channelId, String reason) {
        channelRepository.findById(channelId).ifPresent(channel -> channel.markSyncFailed(reason));
    }
}
