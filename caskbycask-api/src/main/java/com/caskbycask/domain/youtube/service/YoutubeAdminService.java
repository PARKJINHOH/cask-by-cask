package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.ChannelPageInfo;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.FeedChannel;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.FeedVideo;
import com.caskbycask.domain.youtube.dto.*;
import com.caskbycask.domain.youtube.entity.YoutubeChannel;
import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.entity.YoutubeVideoSpiritTag;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoSource;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import com.caskbycask.domain.youtube.repository.YoutubeChannelRepository;
import com.caskbycask.domain.youtube.repository.YoutubeVideoRepository;
import com.caskbycask.domain.youtube.util.YoutubeUrlParser;
import com.caskbycask.domain.youtube.util.YoutubeUrlParser.ChannelReference;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** 관리자 유튜브 갤러리 운영 — 채널 등록·수정과 영상 노출 관리. */
@Service
@RequiredArgsConstructor
public class YoutubeAdminService {

    private final YoutubeChannelRepository channelRepository;
    private final YoutubeVideoRepository videoRepository;
    private final SpiritRepository spiritRepository;
    private final YoutubeFeedClient feedClient;
    private final YoutubeSyncService syncService;
    private final YoutubeAvailabilityService availabilityService;
    private final YoutubeAdminWriter adminWriter;

    // ═══════════════════════════════════════════
    // 채널
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<AdminYoutubeChannelResponse> getChannels(Boolean visible, String keyword, int page, int size) {
        return channelRepository
                .findAllForAdmin(visible, blankToNull(keyword), PageRequest.of(page, size))
                .map(channel -> AdminYoutubeChannelResponse.from(
                        channel, videoRepository.countByChannelId(channel.getId())));
    }

    @Transactional(readOnly = true)
    public AdminYoutubeChannelResponse getChannel(Long channelId) {
        YoutubeChannel channel = findChannel(channelId);
        return AdminYoutubeChannelResponse.from(channel, videoRepository.countByChannelId(channelId));
    }

    /**
     * 채널 등록.
     * <p>
     * 유튜브 호출(핸들 해석·채널명·프로필)은 트랜잭션 밖에서 먼저 끝낸다 — 외부가 느릴 때
     * DB 트랜잭션을 그만큼 붙들지 않기 위해서다. 등록 직후 첫 수집까지 이어서 돌려
     * 관리자가 화면을 벗어나기 전에 영상이 채워지게 한다.
     */
    public AdminYoutubeChannelResponse createChannel(CreateYoutubeChannelRequest request, Long adminId) {
        ChannelReference reference = YoutubeUrlParser.parseChannelReference(request.channelUrl());
        if (reference == null) {
            throw new CustomException(ErrorCode.YOUTUBE_CHANNEL_URL_INVALID);
        }

        // 채널 ID 와 프로필 이미지는 같은 페이지에 있으므로 한 번만 받는다.
        ChannelPageInfo page = feedClient.fetchChannelPageInfo(
                reference.handle(), reference.channelKey());
        String channelKey = page.channelKey();
        if (channelKey == null) {
            throw new CustomException(ErrorCode.YOUTUBE_CHANNEL_UNRESOLVED);
        }
        if (channelRepository.existsByChannelKey(channelKey)) {
            throw new CustomException(ErrorCode.YOUTUBE_CHANNEL_DUPLICATE);
        }

        String title = blankToNull(request.title());
        if (title == null) {
            FeedChannel header = feedClient.fetchChannelHeader(channelKey);
            title = header != null ? header.title() : null;
        }
        if (title == null) {
            // 채널명을 못 읽었다고 등록을 막지는 않는다 — 관리자가 나중에 고칠 수 있다.
            title = reference.handle() != null ? "@" + reference.handle() : channelKey;
        }

        String thumbnailUrl = blankToNull(request.thumbnailUrl());
        if (thumbnailUrl == null) thumbnailUrl = page.thumbnailUrl();

        Long channelId = adminWriter.saveChannel(
                request, adminId, channelKey, reference.handle(), title, thumbnailUrl);

        // 첫 수집. 실패해도 채널 등록 자체는 유지하고 사유만 채널 행에 남는다.
        if (request.syncEnabled() == null || request.syncEnabled()) {
            syncService.syncChannel(channelId);
        }
        return getChannel(channelId);
    }

    @Transactional
    public AdminYoutubeChannelResponse updateChannel(Long channelId, UpdateYoutubeChannelRequest request) {
        YoutubeChannel channel = findChannel(channelId);
        String handle = blankToNull(stripHandlePrefix(request.handle()));

        channel.updateProfile(
                request.title().trim(),
                handle,
                blankToNull(request.description()),
                blankToNull(request.descriptionEn()),
                blankToNull(request.thumbnailUrl()),
                YoutubeUrlParser.channelHomeUrl(channel.getChannelKey(), handle));
        channel.updateExposure(
                request.visible(),
                request.syncEnabled(),
                request.permissionConfirmed(),
                blankToNull(request.permissionNote()));

        return AdminYoutubeChannelResponse.from(channel, videoRepository.countByChannelId(channelId));
    }

    /** 채널을 지우면 그 채널의 영상도 함께 사라진다(FK ON DELETE CASCADE). */
    @Transactional
    public void deleteChannel(Long channelId) {
        channelRepository.delete(findChannel(channelId));
    }

    @Transactional
    public void reorderChannels(List<Long> orderedIds) {
        for (int index = 0; index < orderedIds.size(); index++) {
            Long id = orderedIds.get(index);
            int order = index;
            channelRepository.findById(id).ifPresent(channel -> channel.setSortOrder(order));
        }
    }

    public YoutubeSyncResultResponse syncChannel(Long channelId) {
        if (!channelRepository.existsById(channelId)) {
            throw new CustomException(ErrorCode.YOUTUBE_CHANNEL_NOT_FOUND);
        }
        return YoutubeSyncResultResponse.from(List.of(syncService.syncChannel(channelId)));
    }

    public YoutubeSyncResultResponse syncAll() {
        return YoutubeSyncResultResponse.from(syncService.syncAllChannels());
    }

    /**
     * 삭제·비공개된 영상을 지금 점검한다(정기 배치와 같은 경로).
     * <p>영상이 많으면 요청이 길어질 수 있어 한 번에 확인하는 수에 상한이 있다.
     */
    public YoutubeAvailabilityResultResponse checkAvailability() {
        return YoutubeAvailabilityResultResponse.of(
                availabilityService.sweep(),
                videoRepository.countByAutoHiddenTrue());
    }

    /**
     * 채널명·프로필 이미지를 유튜브에서 다시 읽어 온다.
     * <p>
     * 등록 당시 못 읽었거나 창작자가 프로필을 바꾼 경우에 쓴다. 채널을 지웠다 다시 만들면
     * 수집해 둔 영상과 노출 설정까지 함께 날아가므로 별도 경로를 둔다.
     * <p>읽어 온 값이 없으면 <b>기존 값을 지우지 않는다</b> — 유튜브 응답이 실패했을 때
     * 멀쩡한 프로필이 사라지는 것이 다시 못 읽는 것보다 나쁘다.
     */
    public AdminYoutubeChannelResponse refreshChannelProfile(Long channelId) {
        AdminYoutubeChannelResponse current = getChannel(channelId);

        // 유튜브 호출은 트랜잭션 밖에서 끝내고, 쓰기는 adminWriter(별도 빈)에 맡긴다 —
        // 같은 클래스의 @Transactional 메서드를 부르면 프록시가 걸리지 않아 변경이 저장되지 않는다.
        ChannelPageInfo page = feedClient.fetchChannelPageInfo(
                current.handle(), current.channelKey());
        FeedChannel header = feedClient.fetchChannelHeader(current.channelKey());

        adminWriter.applyRefreshedProfile(
                channelId,
                header != null ? header.title() : null,
                page.handle(),
                page.thumbnailUrl());
        return getChannel(channelId);
    }

    // ═══════════════════════════════════════════
    // 영상
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<AdminYoutubeVideoResponse> getVideos(Long channelId, Boolean visible, String keyword,
                                                     int page, int size) {
        return videoRepository
                .findAllForAdmin(channelId, visible, blankToNull(keyword), PageRequest.of(page, size))
                .map(video -> AdminYoutubeVideoResponse.from(video, false));
    }

    @Transactional(readOnly = true)
    public AdminYoutubeVideoResponse getVideo(Long videoId) {
        return AdminYoutubeVideoResponse.from(findVideo(videoId), true);
    }

    /** 영상 직접 등록 — 피드 상한(최신 15편) 밖의 오래된 영상을 올릴 때 쓴다. */
    public AdminYoutubeVideoResponse createVideo(CreateYoutubeVideoRequest request) {
        String videoKey = YoutubeUrlParser.parseVideoKey(request.videoUrl());
        if (videoKey == null) {
            throw new CustomException(ErrorCode.YOUTUBE_VIDEO_URL_INVALID);
        }
        if (videoRepository.findByVideoKey(videoKey).isPresent()) {
            throw new CustomException(ErrorCode.YOUTUBE_VIDEO_DUPLICATE);
        }

        YoutubeVideoType videoType = parseVideoType(request.videoType());
        if (videoType == null) {
            videoType = YoutubeUrlParser.looksLikeShorts(request.videoUrl())
                    ? YoutubeVideoType.SHORTS
                    : YoutubeVideoType.VIDEO;
        }

        String title = blankToNull(request.title());
        FeedVideo fetched = title == null ? feedClient.fetchSingleVideo(videoKey, videoType) : null;
        if (title == null) {
            if (fetched == null) throw new CustomException(ErrorCode.YOUTUBE_VIDEO_UNRESOLVED);
            title = fetched.title();
        }

        Long videoId = adminWriter.saveManualVideo(request.channelId(), videoKey, title, videoType, fetched);
        return getVideo(videoId);
    }

    @Transactional
    public AdminYoutubeVideoResponse updateVideo(Long videoId, UpdateYoutubeVideoRequest request) {
        YoutubeVideo video = findVideo(videoId);

        if (request.visible() != null) {
            video.updateVisibility(request.visible(), blankToNull(request.hiddenReason()));
        }
        if (request.pinned() != null) {
            video.updatePinned(request.pinned());
        }
        YoutubeVideoType videoType = parseVideoType(request.videoType());
        if (videoType != null) {
            video.updateVideoType(videoType);
        }
        // null = 태그를 건드리지 않음, 빈 배열 = 모두 해제 (UpdateYoutubeVideoRequest 규약)
        if (request.spiritIds() != null) {
            video.replaceSpiritTags(buildSpiritTags(video, request.spiritIds()));
        }
        return AdminYoutubeVideoResponse.from(video, true);
    }

    @Transactional
    public void deleteVideo(Long videoId) {
        YoutubeVideo video = findVideo(videoId);
        if (video.getSource() == YoutubeVideoSource.CHANNEL_FEED) {
            // 자동 수집분을 지워도 다음 수집에서 다시 들어온다. 숨김이 실제로 원하는 동작이다.
            video.updateVisibility(false, "관리자 숨김");
            return;
        }
        videoRepository.delete(video);
    }

    // ═══════════════════════════════════════════
    // 내부
    // ═══════════════════════════════════════════

    private List<YoutubeVideoSpiritTag> buildSpiritTags(YoutubeVideo video, List<Long> spiritIds) {
        // 같은 주류를 두 번 보내도 유니크 제약에 걸리지 않게 순서를 지키며 중복만 걷어낸다.
        Set<Long> unique = new LinkedHashSet<>(spiritIds);
        List<YoutubeVideoSpiritTag> tags = new ArrayList<>(unique.size());
        int order = 0;
        for (Long spiritId : unique) {
            Spirit spirit = spiritRepository.findById(spiritId)
                    .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
            tags.add(YoutubeVideoSpiritTag.builder()
                    .video(video)
                    .spirit(spirit)
                    .sortOrder(order++)
                    .build());
        }
        return tags;
    }

    private YoutubeChannel findChannel(Long channelId) {
        return channelRepository.findById(channelId)
                .orElseThrow(() -> new CustomException(ErrorCode.YOUTUBE_CHANNEL_NOT_FOUND));
    }

    private YoutubeVideo findVideo(Long videoId) {
        return videoRepository.findById(videoId)
                .orElseThrow(() -> new CustomException(ErrorCode.YOUTUBE_VIDEO_NOT_FOUND));
    }

    private YoutubeVideoType parseVideoType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return YoutubeVideoType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String stripHandlePrefix(String handle) {
        if (handle == null) return null;
        String trimmed = handle.trim();
        return trimmed.startsWith("@") ? trimmed.substring(1) : trimmed;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
