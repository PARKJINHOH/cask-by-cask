package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.youtube.client.YoutubeFeedClient;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.FeedVideo;
import com.caskbycask.domain.youtube.repository.YoutubeChannelRepository;
import com.caskbycask.domain.youtube.service.YoutubeSyncWriter.PersistOutcome;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 등록된 채널의 최신 영상을 따라잡는다.
 * <p>
 * 유튜브 호출은 <b>트랜잭션 밖</b>에서 한다 — 채널이 늘수록 네트워크 대기가 길어지는데
 * 그동안 DB 커넥션을 붙들고 있으면 사용자 요청이 밀린다. 실제 쓰기는 {@link YoutubeSyncWriter}
 * 가 짧은 트랜잭션으로 처리한다.
 * <p>
 * 채널 하나가 실패해도 나머지는 계속한다. 실패 사유는 그 채널 행에 남아 관리자 화면에 보인다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YoutubeSyncService {

    private final YoutubeChannelRepository channelRepository;
    private final YoutubeFeedClient feedClient;
    private final YoutubeSyncWriter syncWriter;

    /** 채널 한 곳의 수집 결과. 관리자 화면이 "새 영상 N편"을 보여 주는 데 쓴다. */
    public record SyncResult(Long channelId, String channelTitle, int created, int updated, String error) {
        public boolean isFailure() {
            return error != null;
        }
    }

    /** 스케줄러가 부르는 전체 수집. */
    public List<SyncResult> syncAllChannels() {
        List<SyncResult> results = loadSyncTargets().stream()
                .map(target -> syncChannel(target.id(), target.title(), target.channelKey()))
                .toList();
        if (results.isEmpty()) return results;

        log.info("유튜브 갤러리 수집 완료: 채널={}, 신규={}, 실패={}",
                results.size(),
                results.stream().mapToInt(SyncResult::created).sum(),
                results.stream().filter(SyncResult::isFailure).count());
        return results;
    }

    /** 관리자 화면의 '지금 수집' 버튼. */
    public SyncResult syncChannel(Long channelId) {
        SyncTarget target = loadTarget(channelId);
        if (target == null) {
            return new SyncResult(channelId, null, 0, 0, "채널을 찾을 수 없습니다.");
        }
        return syncChannel(target.id(), target.title(), target.channelKey());
    }

    private SyncResult syncChannel(Long channelId, String channelTitle, String channelKey) {
        List<FeedVideo> feedVideos;
        try {
            feedVideos = feedClient.fetchLatestVideos(channelKey);
        } catch (YoutubeFeedClient.YoutubeFetchException e) {
            log.warn("유튜브 피드 수집 실패: channelKey={}", channelKey, e);
            String reason = e.getMessage();
            syncWriter.recordFailure(channelId, reason);
            return new SyncResult(channelId, channelTitle, 0, 0, reason);
        } catch (RuntimeException e) {
            log.warn("유튜브 피드 수집 실패: channelKey={}", channelKey, e);
            String reason = "피드를 읽지 못했습니다: " + e.getClass().getSimpleName();
            syncWriter.recordFailure(channelId, reason);
            return new SyncResult(channelId, channelTitle, 0, 0, reason);
        }

        if (feedVideos.isEmpty()) {
            String reason = "피드에서 영상을 찾지 못했습니다. 채널에 공개 영상이 있는지 확인해주세요.";
            syncWriter.recordFailure(channelId, reason);
            return new SyncResult(channelId, channelTitle, 0, 0, reason);
        }

        try {
            PersistOutcome outcome = syncWriter.persistFeed(channelId, feedVideos);
            return new SyncResult(channelId, channelTitle, outcome.created(), outcome.updated(), null);
        } catch (RuntimeException e) {
            log.error("유튜브 수집 결과 저장 실패: channelId={}", channelId, e);
            String reason = "수집 결과를 저장하지 못했습니다: " + e.getClass().getSimpleName();
            syncWriter.recordFailure(channelId, reason);
            return new SyncResult(channelId, channelTitle, 0, 0, reason);
        }
    }

    /**
     * 네트워크를 타기 전에 필요한 값만 미리 꺼내 둔다 — 엔티티를 세션 밖으로 들고 다니지 않는다.
     * 여기서 읽는 것은 모두 기본 컬럼이라 리포지토리 자체 트랜잭션으로 충분하다.
     */
    private record SyncTarget(Long id, String title, String channelKey) {
    }

    private List<SyncTarget> loadSyncTargets() {
        return channelRepository.findSyncTargets().stream()
                .map(channel -> new SyncTarget(channel.getId(), channel.getTitle(), channel.getChannelKey()))
                .toList();
    }

    private SyncTarget loadTarget(Long channelId) {
        return channelRepository.findById(channelId)
                .map(channel -> new SyncTarget(channel.getId(), channel.getTitle(), channel.getChannelKey()))
                .orElse(null);
    }
}
