package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import com.caskbycask.domain.seo.event.IndexingEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 게시글 색인 통지의 <b>대상 판정</b>을 못 박는다.
 * <p>
 * 여기가 느슨하면 sitemap 에서 일부러 뺀 주소(성인 전용·숨김·삭제)를 IndexNow 로는
 * "크롤해 달라"고 조르게 된다. 통지는 외부 검색엔진으로 나가는 단방향 동작이라
 * 잘못 보낸 뒤에는 되돌릴 방법이 없어, 보내기 전에 거르는 것 말고는 안전장치가 없다.
 * <p>
 * 조건은 {@code SitemapService.generateContentSitemap} 의 게시글 쿼리와 같아야 한다.
 */
class PostIndexingEventPublisherTest {

    private final ApplicationEventPublisher applicationEventPublisher = mock(ApplicationEventPublisher.class);
    private final PostIndexingEventPublisher publisher = new PostIndexingEventPublisher(applicationEventPublisher);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(publisher, "siteUrl", "https://www.caskbycask.net/");
    }

    @Test
    @DisplayName("공개된 글은 게시판 경로가 들어간 한국어 주소로 통지한다")
    void publishesKoreanUrlForPublicPost() {
        publisher.publish(post(101L, BoardType.FREE, PostStatus.ACTIVE, false, false));

        var captor = forClass(IndexingEvent.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().kind()).isEqualTo("post");
        assertThat(captor.getValue().urls())
                .containsExactly("https://www.caskbycask.net/ko/community/free/101");
    }

    @Test
    @DisplayName("성인 전용 글은 통지하지 않는다")
    void skipsAdultOnlyPost() {
        publisher.publish(post(102L, BoardType.FREE, PostStatus.ACTIVE, false, true));

        verify(applicationEventPublisher, never()).publishEvent(any(IndexingEvent.class));
    }

    @Test
    @DisplayName("숨긴 글은 통지하지 않는다")
    void skipsHiddenPost() {
        publisher.publish(post(103L, BoardType.PHOTO, PostStatus.ACTIVE, true, false));

        verify(applicationEventPublisher, never()).publishEvent(any(IndexingEvent.class));
    }

    @Test
    @DisplayName("삭제된 글은 통지하지 않는다")
    void skipsDeletedPost() {
        publisher.publish(post(104L, BoardType.FREE, PostStatus.DELETED, false, false));

        verify(applicationEventPublisher, never()).publishEvent(any(IndexingEvent.class));
    }

    @Test
    @DisplayName("아직 저장되지 않은 글은 통지하지 않는다")
    void skipsUnsavedPost() {
        publisher.publish(null);
        publisher.publish(Post.builder().boardType(BoardType.FREE).build());

        verify(applicationEventPublisher, never()).publishEvent(any(IndexingEvent.class));
    }

    private Post post(Long id, BoardType boardType, PostStatus status, boolean hidden, boolean adultOnly) {
        Post post = Post.builder()
                .boardType(boardType)
                .status(status)
                .isHidden(hidden)
                .adultOnly(adultOnly)
                .title("제목")
                .content("본문")
                .contentSanitized("본문")
                .build();
        ReflectionTestUtils.setField(post, "id", id);
        return post;
    }
}
