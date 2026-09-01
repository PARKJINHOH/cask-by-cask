package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.client.ReviewSourceClient;
import com.caskbycask.domain.review.dto.ReviewImportFetchResponse;
import com.caskbycask.domain.review.support.ReviewSourceUrlParser.SourceSite;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReviewImportServiceTest {

    @Mock
    private ReviewSourceClient reviewSourceClient;

    @InjectMocks
    private ReviewImportService reviewImportService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(reviewImportService, "enabled", true);
        ReflectionTestUtils.setField(reviewImportService, "arcaliveChannels", List.of("alcohol"));
    }

    @Test
    @DisplayName("공개 게시글 본문을 그대로 돌려준다")
    void returnsFetchedPost() {
        given(reviewSourceClient.fetch(any())).willReturn(new ReviewSourceClient.SourcePost(
                "위나리) 와일드터키 12y",
                "N: 바닐라 캬라멜\nP: 구운땅콩\nF: 오크",
                "https://gall.dcinside.com/mgallery/board/view/?id=whiskey&no=1771927"));

        ReviewImportFetchResponse response = reviewImportService.fetch(
                "https://gall.dcinside.com/mgallery/board/view/?id=whiskey&no=1771927");

        assertThat(response.sourceSite()).isEqualTo(SourceSite.DCINSIDE);
        assertThat(response.title()).isEqualTo("위나리) 와일드터키 12y");
        assertThat(response.content()).contains("구운땅콩");
    }

    @Test
    @DisplayName("해석할 수 없는 주소는 외부 요청 없이 거절한다")
    void rejectsUnsupportedUrlWithoutFetching() {
        assertThatThrownBy(() -> reviewImportService.fetch("https://cafe.naver.com/f-e/cafes/1/articles/2"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.REVIEW_IMPORT_UNSUPPORTED_URL);

        verify(reviewSourceClient, never()).fetch(any());
    }

    @Test
    @DisplayName("허용 목록 밖 아카라이브 채널은 요청하지 않는다")
    void rejectsOtherArcaliveChannels() {
        assertThatThrownBy(() -> reviewImportService.fetch("https://arca.live/b/genshin/12345"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.REVIEW_IMPORT_UNSUPPORTED_URL);

        verify(reviewSourceClient, never()).fetch(any());
    }

    @Test
    @DisplayName("원문을 못 읽으면 붙여넣기로 안내할 오류를 낸다")
    void mapsFetchFailure() {
        given(reviewSourceClient.fetch(any())).willReturn(null);

        assertThatThrownBy(() -> reviewImportService.fetch(
                "https://gall.dcinside.com/mgallery/board/view/?id=whiskey&no=1"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.REVIEW_IMPORT_FETCH_FAILED);
    }

    @Test
    @DisplayName("설정으로 꺼 두면 외부 요청을 아예 하지 않는다")
    void honoursDisabledFlag() {
        ReflectionTestUtils.setField(reviewImportService, "enabled", false);

        assertThatThrownBy(() -> reviewImportService.fetch(
                "https://gall.dcinside.com/mgallery/board/view/?id=whiskey&no=1"))
                .isInstanceOf(CustomException.class);

        verify(reviewSourceClient, never()).fetch(any());
    }
}
