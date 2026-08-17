package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.FeedVideo;
import com.caskbycask.domain.youtube.dto.CreateYoutubeChannelRequest;
import com.caskbycask.domain.youtube.entity.YoutubeChannel;
import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoSource;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import com.caskbycask.domain.youtube.repository.YoutubeChannelRepository;
import com.caskbycask.domain.youtube.repository.YoutubeVideoRepository;
import com.caskbycask.domain.youtube.util.YoutubeUrlParser;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 관리자 등록의 쓰기 단계.
 * <p>
 * {@link YoutubeAdminService} 는 유튜브 호출을 트랜잭션 밖에서 먼저 끝낸 뒤 여기로 넘긴다.
 * 별도 빈인 이유는 {@link YoutubeSyncWriter} 와 같다 — 자기 호출에는 {@code @Transactional}
 * 프록시가 걸리지 않아, 같은 클래스의 메서드로 두면 트랜잭션 없이 실행된다.
 */
@Component
@RequiredArgsConstructor
public class YoutubeAdminWriter {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final YoutubeChannelRepository channelRepository;
    private final YoutubeVideoRepository videoRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long saveChannel(CreateYoutubeChannelRequest request, Long adminId,
                            String channelKey, String handle, String title, String thumbnailUrl) {
        YoutubeChannel channel = YoutubeChannel.builder()
                .channelKey(channelKey)
                .handle(handle)
                .title(title)
                .description(trimToNull(request.description()))
                .descriptionEn(trimToNull(request.descriptionEn()))
                .thumbnailUrl(thumbnailUrl)
                .channelUrl(YoutubeUrlParser.channelHomeUrl(channelKey, handle))
                .isVisible(Boolean.TRUE.equals(request.visible()))
                .syncEnabled(request.syncEnabled() == null || request.syncEnabled())
                .permissionConfirmed(Boolean.TRUE.equals(request.permissionConfirmed()))
                .permissionNote(trimToNull(request.permissionNote()))
                .sortOrder(nextSortOrder())
                .createdBy(adminId == null ? null : userRepository.getByIdOrThrow(adminId))
                .build();
        return channelRepository.save(channel).getId();
    }

    /**
     * 유튜브에서 다시 읽어 온 채널명·핸들·프로필을 반영한다.
     * <p>
     * 읽어 온 값이 없으면 <b>기존 값을 지우지 않는다</b> — 유튜브 응답이 실패했을 때 멀쩡한
     * 프로필이 사라지는 것이 다시 못 읽는 것보다 나쁘다.
     * <p>
     * 핸들이 채워지면 채널 홈 주소도 사람이 읽는 형태(`youtube.com/@핸들`)로 함께 올린다 —
     * 채널 ID 로 등록한 채널이 나중에 핸들을 얻는 경로다.
     */
    @Transactional
    public void applyRefreshedProfile(Long channelId, String title, String handle, String thumbnailUrl) {
        YoutubeChannel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new CustomException(ErrorCode.YOUTUBE_CHANNEL_NOT_FOUND));

        String nextHandle = trimToNull(handle) != null ? handle.trim() : channel.getHandle();
        channel.updateProfile(
                trimToNull(title) != null ? title.trim() : channel.getTitle(),
                nextHandle,
                channel.getDescription(),
                channel.getDescriptionEn(),
                trimToNull(thumbnailUrl) != null ? thumbnailUrl.trim() : channel.getThumbnailUrl(),
                YoutubeUrlParser.channelHomeUrl(channel.getChannelKey(), nextHandle));
    }

    @Transactional
    public Long saveManualVideo(Long channelId, String videoKey, String title,
                                YoutubeVideoType videoType, FeedVideo fetched) {
        YoutubeChannel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new CustomException(ErrorCode.YOUTUBE_CHANNEL_NOT_FOUND));

        YoutubeVideo video = YoutubeVideo.builder()
                .channel(channel)
                .videoKey(videoKey)
                .title(title)
                .description(fetched != null ? fetched.description() : null)
                .thumbnailUrl("https://i.ytimg.com/vi/" + videoKey + "/hqdefault.jpg")
                .videoType(videoType)
                .source(YoutubeVideoSource.MANUAL)
                // 게시일을 알 수 없어 등록 시각을 쓴다. 목록이 최신순이라 맨 위로 올라오는데,
                // 오래된 대표 영상을 앞으로 끌어올리려는 등록이라 의도와도 맞는다.
                .publishedAt(fetched != null ? fetched.publishedAt() : LocalDateTime.now(SERVICE_ZONE))
                .isVisible(true)
                .isPinned(false)
                .build();
        return videoRepository.save(video).getId();
    }

    private int nextSortOrder() {
        return channelRepository.findTopByOrderBySortOrderDesc()
                .map(channel -> channel.getSortOrder() + 1)
                .orElse(0);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
