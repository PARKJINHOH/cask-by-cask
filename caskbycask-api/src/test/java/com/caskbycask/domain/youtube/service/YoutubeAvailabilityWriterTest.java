package com.caskbycask.domain.youtube.service;

import com.caskbycask.domain.youtube.client.YoutubeFeedClient.VideoAvailability;
import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoSource;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import com.caskbycask.domain.youtube.repository.YoutubeVideoRepository;
import com.caskbycask.domain.youtube.service.YoutubeAvailabilityWriter.Outcome;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

/**
 * 가용성 점검의 상태 전이 검증.
 * <p>
 * 여기가 틀리면 <b>멀쩡한 영상이 사라지거나, 관리자가 의도적으로 숨긴 영상이 되살아난다.</b>
 * 둘 다 화면을 열어 보기 전에는 드러나지 않아 테스트로 못 박아 둔다.
 */
@ExtendWith(MockitoExtension.class)
class YoutubeAvailabilityWriterTest {

    private static final LocalDateTime CHECKED_AT = LocalDateTime.of(2026, 8, 15, 4, 40);

    @Mock YoutubeVideoRepository videoRepository;
    @InjectMocks YoutubeAvailabilityWriter writer;

    private YoutubeVideo newVideo(boolean visible, boolean autoHidden) {
        return YoutubeVideo.builder()
                .videoKey("abcdefghijk")
                .title("제목")
                .videoType(YoutubeVideoType.VIDEO)
                .source(YoutubeVideoSource.CHANNEL_FEED)
                .publishedAt(CHECKED_AT.minusDays(30))
                .isVisible(visible)
                .isPinned(false)
                .autoHidden(autoHidden)
                .build();
    }

    /** 리포지토리가 이 영상을 돌려주도록 준비한다. 스텁을 쓰지 않는 테스트는 이걸 부르지 않는다. */
    private YoutubeVideo video(boolean visible, boolean autoHidden) {
        YoutubeVideo video = newVideo(visible, autoHidden);
        given(videoRepository.findById(1L)).willReturn(Optional.of(video));
        return video;
    }

    @Test
    void 삭제된_영상은_자동으로_숨긴다() {
        YoutubeVideo target = video(true, false);

        Outcome outcome = writer.apply(1L, VideoAvailability.GONE, CHECKED_AT);

        assertThat(outcome).isEqualTo(Outcome.HIDDEN);
        assertThat(target.getIsVisible()).isFalse();
        assertThat(target.getAutoHidden()).isTrue();
        assertThat(target.getHiddenReason()).contains("삭제");
        assertThat(target.getLastCheckedAt()).isEqualTo(CHECKED_AT);
    }

    @Test
    void 비공개_영상도_자동으로_숨기되_사유가_다르다() {
        YoutubeVideo target = video(true, false);

        assertThat(writer.apply(1L, VideoAvailability.RESTRICTED, CHECKED_AT)).isEqualTo(Outcome.HIDDEN);
        assertThat(target.getHiddenReason()).contains("비공개");
    }

    @Test
    void 자동으로_숨겼던_영상이_되살아나면_복구한다() {
        YoutubeVideo target = video(false, true);

        Outcome outcome = writer.apply(1L, VideoAvailability.AVAILABLE, CHECKED_AT);

        assertThat(outcome).isEqualTo(Outcome.RESTORED);
        assertThat(target.getIsVisible()).isTrue();
        assertThat(target.getAutoHidden()).isFalse();
        assertThat(target.getHiddenReason()).isNull();
    }

    @Test
    void 관리자가_숨긴_영상은_되살리지_않는다() {
        YoutubeVideo target = video(false, false);

        Outcome outcome = writer.apply(1L, VideoAvailability.AVAILABLE, CHECKED_AT);

        assertThat(outcome).isEqualTo(Outcome.UNCHANGED);
        assertThat(target.getIsVisible()).isFalse();
        assertThat(target.getLastCheckedAt()).isEqualTo(CHECKED_AT);
    }

    @Test
    void 관리자가_숨긴_영상이_재생불가여도_노출상태를_건드리지_않는다() {
        YoutubeVideo target = video(false, false);
        target.updateVisibility(false, "관리자 숨김");

        Outcome outcome = writer.apply(1L, VideoAvailability.GONE, CHECKED_AT);

        assertThat(outcome).isEqualTo(Outcome.UNCHANGED);
        assertThat(target.getAutoHidden()).isFalse();
        assertThat(target.getHiddenReason()).isEqualTo("관리자 숨김");
    }

    @Test
    void 이미_자동숨김된_영상은_다시_숨김으로_세지_않는다() {
        video(false, true);

        assertThat(writer.apply(1L, VideoAvailability.GONE, CHECKED_AT)).isEqualTo(Outcome.UNCHANGED);
    }

    @Test
    void 확인_실패는_아무것도_바꾸지_않는다() {
        // 유튜브가 잠깐 느린 것과 영상이 지워진 것은 다르다. 잘못 내리면 멀쩡한 영상이 사라진다.
        Outcome outcome = writer.apply(1L, VideoAvailability.UNKNOWN, CHECKED_AT);

        assertThat(outcome).isEqualTo(Outcome.SKIPPED);
    }

    @Test
    void 정상_영상은_점검_시각만_남긴다() {
        YoutubeVideo target = video(true, false);

        Outcome outcome = writer.apply(1L, VideoAvailability.AVAILABLE, CHECKED_AT);

        assertThat(outcome).isEqualTo(Outcome.UNCHANGED);
        assertThat(target.getIsVisible()).isTrue();
        assertThat(target.getLastCheckedAt()).isEqualTo(CHECKED_AT);
    }

    @Test
    void 관리자가_자동숨김을_풀면_자동숨김_표시도_사라진다() {
        // 표시가 남아 있으면 다음 점검이 "내가 숨긴 것"으로 보고 또 내려 버린다.
        YoutubeVideo target = newVideo(false, true);

        target.updateVisibility(true, null);

        assertThat(target.getAutoHidden()).isFalse();
        assertThat(target.getIsVisible()).isTrue();
    }
}
