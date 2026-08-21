package com.caskbycask.domain.youtube.client;

import com.caskbycask.domain.youtube.client.YoutubeFeedClient.ChannelPageInfo;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.FeedChannel;
import com.caskbycask.domain.youtube.client.YoutubeFeedClient.FeedVideo;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.lang.reflect.Field;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class YoutubeFeedClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("YouTube Data API 키가 설정되어 있을 때 UULF 와 UUSH 플레이리스트로 일반 영상과 숏츠를 구분 수집한다")
    void fetchLatestVideosViaApi_withShortsAndVideo() throws Exception {
        String apiKey = "AIzaSyTestKey";
        YoutubeFeedClient client = new YoutubeFeedClient(apiKey, 3000, 5000, objectMapper);

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        setField(client, "restClient", builder.build());

        String channelKey = "UC1234567890123456789012";
        String suffix = "1234567890123456789012";
        String longformUrl = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=UULF"
                + suffix + "&maxResults=15&key=" + apiKey;
        String shortsUrl = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=UUSH"
                + suffix + "&maxResults=15&key=" + apiKey;

        String longformResponse = """
                {
                  "items": [
                    {
                      "snippet": {
                        "publishedAt": "2026-08-20T10:00:00Z",
                        "title": "테스트 일반 영상 리뷰",
                        "description": "롱폼 위스키 설명입니다.",
                        "thumbnails": {
                          "high": { "url": "https://i.ytimg.com/vi/videoKey001/hqdefault.jpg" }
                        },
                        "resourceId": {
                          "videoId": "videoKey001"
                        }
                      }
                    }
                  ]
                }
                """;

        String shortsResponse = """
                {
                  "items": [
                    {
                      "snippet": {
                        "publishedAt": "2026-08-21T10:00:00Z",
                        "title": "1분 위스키 꿀팁 #shorts",
                        "description": "숏츠 영상입니다.",
                        "thumbnails": {
                          "high": { "url": "https://i.ytimg.com/vi/shortsKey001/hqdefault.jpg" }
                        },
                        "resourceId": {
                          "videoId": "shortsKey001"
                        }
                      }
                    }
                  ]
                }
                """;

        server.expect(requestTo(longformUrl))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(longformResponse, MediaType.APPLICATION_JSON));

        server.expect(requestTo(shortsUrl))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(shortsResponse, MediaType.APPLICATION_JSON));

        List<FeedVideo> videos = client.fetchLatestVideos(channelKey);

        assertThat(videos).hasSize(2);

        FeedVideo video1 = videos.get(0);
        assertThat(video1.videoKey()).isEqualTo("videoKey001");
        assertThat(video1.videoType()).isEqualTo(YoutubeVideoType.VIDEO);

        FeedVideo video2 = videos.get(1);
        assertThat(video2.videoKey()).isEqualTo("shortsKey001");
        assertThat(video2.videoType()).isEqualTo(YoutubeVideoType.SHORTS);

        server.verify();
    }

    @Test
    @DisplayName("#shorts 태그나 제목으로 숏츠 여부를 정확히 판별한다")
    void testIsShortsText() {
        assertThat(YoutubeFeedClient.isShortsText("가성비 위스키 추천 #shorts", null)).isTrue();
        assertThat(YoutubeFeedClient.isShortsText("가성비 위스키 추천 #Shorts", null)).isTrue();
        assertThat(YoutubeFeedClient.isShortsText("가성비 위스키 추천 #쇼츠", null)).isTrue();
        assertThat(YoutubeFeedClient.isShortsText("가성비 위스키 추천", "설명란에 #shorts 포함")).isTrue();
        assertThat(YoutubeFeedClient.isShortsText("일반 위스키 리뷰 영상", "평범한 본문입니다.")).isFalse();
    }

    @Test
    @DisplayName("YouTube Data API 로 핸들 기반 채널 정보를 정상 조회한다")
    void fetchChannelPageInfoViaApi() throws Exception {
        String apiKey = "AIzaSyTestKey";
        YoutubeFeedClient client = new YoutubeFeedClient(apiKey, 3000, 5000, objectMapper);

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        setField(client, "restClient", builder.build());

        String expectedUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet&key="
                + apiKey + "&forHandle=whiskyhub";

        String mockResponse = """
                {
                  "items": [
                    {
                      "id": "UC1234567890123456789012",
                      "snippet": {
                        "title": "위스키허브",
                        "customUrl": "@whiskyhub",
                        "thumbnails": {
                          "high": { "url": "https://yt3.ggpht.com/avatar.jpg" }
                        }
                      }
                    }
                  ]
                }
                """;

        server.expect(requestTo(expectedUrl))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(mockResponse, MediaType.APPLICATION_JSON));

        ChannelPageInfo info = client.fetchChannelPageInfo("whiskyhub", null);

        assertThat(info).isNotNull();
        assertThat(info.channelKey()).isEqualTo("UC1234567890123456789012");
        assertThat(info.handle()).isEqualTo("whiskyhub");
        assertThat(info.thumbnailUrl()).isEqualTo("https://yt3.ggpht.com/avatar.jpg");

        server.verify();
    }

    @Test
    @DisplayName("YouTube Data API 로 채널 헤더를 정상 조회한다")
    void fetchChannelHeaderViaApi() throws Exception {
        String apiKey = "AIzaSyTestKey";
        YoutubeFeedClient client = new YoutubeFeedClient(apiKey, 3000, 5000, objectMapper);

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        setField(client, "restClient", builder.build());

        String channelKey = "UC1234567890123456789012";
        String expectedUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet&id="
                + channelKey + "&key=" + apiKey;

        String mockResponse = """
                {
                  "items": [
                    {
                      "id": "UC1234567890123456789012",
                      "snippet": {
                        "title": "주류학개론"
                      }
                    }
                  ]
                }
                """;

        server.expect(requestTo(expectedUrl))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(mockResponse, MediaType.APPLICATION_JSON));

        FeedChannel header = client.fetchChannelHeader(channelKey);

        assertThat(header).isNotNull();
        assertThat(header.channelKey()).isEqualTo(channelKey);
        assertThat(header.title()).isEqualTo("주류학개론");

        server.verify();
    }

    private static void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
