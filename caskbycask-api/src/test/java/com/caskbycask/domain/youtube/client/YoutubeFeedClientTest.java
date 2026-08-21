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
    @DisplayName("YouTube Data API 키가 설정되어 있을 때 playlistItems 로 최신 영상을 정상 수집한다")
    void fetchLatestVideosViaApi() throws Exception {
        String apiKey = "AIzaSyTestKey";
        YoutubeFeedClient client = new YoutubeFeedClient(apiKey, 3000, 5000, objectMapper);

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        setField(client, "restClient", builder.build());

        String channelKey = "UC1234567890123456789012";
        String uploadsPlaylistId = "UU1234567890123456789012";
        String expectedUrl = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId="
                + uploadsPlaylistId + "&maxResults=15&key=" + apiKey;

        String mockResponse = """
                {
                  "items": [
                    {
                      "snippet": {
                        "publishedAt": "2026-08-20T10:00:00Z",
                        "title": "테스트 위스키 리뷰",
                        "description": "위스키 설명입니다.",
                        "thumbnails": {
                          "high": { "url": "https://i.ytimg.com/vi/testVid1234/hqdefault.jpg" }
                        },
                        "resourceId": {
                          "videoId": "testVid1234"
                        }
                      }
                    }
                  ]
                }
                """;

        server.expect(requestTo(expectedUrl))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(mockResponse, MediaType.APPLICATION_JSON));

        List<FeedVideo> videos = client.fetchLatestVideos(channelKey);

        assertThat(videos).hasSize(1);
        FeedVideo video = videos.get(0);
        assertThat(video.videoKey()).isEqualTo("testVid1234");
        assertThat(video.title()).isEqualTo("테스트 위스키 리뷰");
        assertThat(video.description()).isEqualTo("위스키 설명입니다.");
        assertThat(video.thumbnailUrl()).isEqualTo("https://i.ytimg.com/vi/testVid1234/hqdefault.jpg");
        assertThat(video.videoType()).isEqualTo(YoutubeVideoType.VIDEO);

        server.verify();
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
