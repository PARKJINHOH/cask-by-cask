package com.caskbycask.domain.youtube.dto;

import com.caskbycask.domain.youtube.entity.YoutubeChannel;
import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.util.YoutubeUrlParser;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 공개 갤러리의 영상 한 편.
 * <p>
 * 조회수·재생시간은 없다 — Data API 를 쓰지 않기 때문이고, 있더라도 금세 낡아 화면에 거짓이 남는다.
 * 임베드·원문 주소는 서버가 조립해 내려 준다(프론트가 주소 규칙을 따로 알 필요가 없게).
 */
public record YoutubeVideoResponse(
        Long id,
        String videoKey,
        String title,
        String description,
        String thumbnailUrl,
        String videoType,
        LocalDateTime publishedAt,
        boolean pinned,
        String embedUrl,
        String watchUrl,
        Channel channel,
        List<YoutubeSpiritTagInfo> spiritTags
) {
    /**
     * 카드마다 붙는 채널 요약.
     * <p>{@code channelUrl} 은 유튜브 채널 홈이고, {@code handle}/{@code channelKey} 는
     * 우리 채널 페이지(`/youtube/channels/…`) 주소를 만드는 데 쓴다 — 핸들이 없는 채널도 있어 둘 다 준다.
     */
    public record Channel(
            Long id,
            String title,
            String handle,
            String channelKey,
            String thumbnailUrl,
            String channelUrl
    ) {
        static Channel from(YoutubeChannel channel) {
            return new Channel(
                    channel.getId(),
                    channel.getTitle(),
                    channel.getHandle(),
                    channel.getChannelKey(),
                    channel.getThumbnailUrl(),
                    channel.getChannelUrl()
            );
        }
    }

    /** 목록용 — 주류 태그는 싣지 않는다(페이지당 N+1 을 만들지 않기 위해). */
    public static YoutubeVideoResponse ofList(YoutubeVideo video) {
        return build(video, List.of());
    }

    /** 상세용 — 주류 태그를 함께 싣는다. */
    public static YoutubeVideoResponse ofDetail(YoutubeVideo video) {
        return build(video, video.getSpiritTags().stream().map(YoutubeSpiritTagInfo::from).toList());
    }

    private static YoutubeVideoResponse build(YoutubeVideo video, List<YoutubeSpiritTagInfo> tags) {
        return new YoutubeVideoResponse(
                video.getId(),
                video.getVideoKey(),
                video.getTitle(),
                video.getDescription(),
                video.getThumbnailUrl(),
                video.getVideoType().name(),
                video.getPublishedAt(),
                Boolean.TRUE.equals(video.getIsPinned()),
                YoutubeUrlParser.embedUrl(video.getVideoKey()),
                YoutubeUrlParser.watchUrl(video.getVideoKey()),
                Channel.from(video.getChannel()),
                tags
        );
    }
}
