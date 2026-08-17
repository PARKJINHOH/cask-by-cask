package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.youtube.dto.YoutubeChannelResponse;
import com.caskbycask.domain.youtube.dto.YoutubeVideoResponse;
import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import com.caskbycask.domain.youtube.repository.YoutubeChannelRepository;
import com.caskbycask.domain.youtube.repository.YoutubeVideoRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 공개 유튜브 갤러리 조회.
 * <p>
 * 모든 조회는 <b>노출 채널 × 노출 영상</b> 교집합만 본다. 채널을 내리면 그 채널의 영상이
 * 목록·상세·주류 상세의 관련 영상에서 한 번에 사라진다 — 창작자가 게재 동의를 철회했을 때
 * 영상을 하나씩 지우지 않아도 되도록 한 것이다.
 */
@Service
@RequiredArgsConstructor
public class YoutubeGalleryService {

    /** 주류 상세에 붙는 관련 영상 개수. 한 줄에 담기는 만큼만. */
    private static final int RELATED_VIDEO_LIMIT = 6;

    private final YoutubeChannelRepository channelRepository;
    private final YoutubeVideoRepository videoRepository;

    @Transactional(readOnly = true)
    public Page<YoutubeVideoResponse> getVideos(Long channelId, String videoType, String keyword,
                                                Long spiritId, int page, int size) {
        Page<YoutubeVideo> videos = videoRepository.findPublicVideos(
                channelId,
                parseVideoType(videoType),
                blankToNull(keyword),
                spiritId,
                PageRequest.of(page, size));
        return videos.map(YoutubeVideoResponse::ofList);
    }

    @Transactional(readOnly = true)
    public YoutubeVideoResponse getVideo(String videoKey) {
        YoutubeVideo video = videoRepository.findPublicByVideoKey(videoKey)
                .orElseThrow(() -> new CustomException(ErrorCode.YOUTUBE_VIDEO_NOT_FOUND));
        return YoutubeVideoResponse.ofDetail(video);
    }

    /** 채널 랜딩 페이지. 핸들 또는 채널 ID 로 찾는다. */
    @Transactional(readOnly = true)
    public YoutubeChannelResponse getChannel(String ref) {
        // 주소에 '@' 를 붙여 들어오는 경우가 있어(사용자가 유튜브 주소를 그대로 옮겨 적는다) 벗겨 낸다.
        String normalized = ref.startsWith("@") ? ref.substring(1) : ref;
        return channelRepository.findPublicByRef(normalized)
                .map(channel -> YoutubeChannelResponse.from(
                        channel, videoRepository.countByChannelIdAndIsVisibleTrue(channel.getId())))
                .orElseThrow(() -> new CustomException(ErrorCode.YOUTUBE_CHANNEL_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public List<YoutubeChannelResponse> getChannels() {
        return channelRepository.findPublicChannels().stream()
                .map(channel -> YoutubeChannelResponse.from(
                        channel, videoRepository.countByChannelIdAndIsVisibleTrue(channel.getId())))
                .toList();
    }

    /** 주류 상세의 '관련 영상'. 태그가 없으면 빈 목록이며 화면에서는 섹션째 사라진다. */
    @Transactional(readOnly = true)
    public List<YoutubeVideoResponse> getVideosBySpirit(Long spiritId) {
        return videoRepository
                .findPublicVideosBySpirit(spiritId, PageRequest.of(0, RELATED_VIDEO_LIMIT))
                .stream()
                .map(YoutubeVideoResponse::ofList)
                .toList();
    }

    /**
     * 알 수 없는 유형 문자열은 필터 없음으로 처리한다 — 주소를 손으로 고친 요청에
     * 500 을 돌려주는 대신 전체 목록을 보여 주는 편이 낫다.
     */
    private YoutubeVideoType parseVideoType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return YoutubeVideoType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
