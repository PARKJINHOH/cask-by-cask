package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import com.caskbycask.domain.seo.event.IndexingEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 커뮤니티 게시글의 색인 통지.
 * <p>
 * 게시판 목록은 새 글이 쌓이면서 계속 밀려나므로, 글이 링크로 발견되려면 목록이 크롤되는 시점과
 * 그 글이 아직 목록에 남아 있는 기간이 겹쳐야 한다. 발행 즉시 통지해 두면 그 우연을 기다리지 않는다.
 * <p>
 * 게시글 본문은 한국어만 있으므로 sitemap 과 동일하게 {@code /ko} 경로만 보낸다.
 */
@Component
@RequiredArgsConstructor
public class PostIndexingEventPublisher {

    private final ApplicationEventPublisher eventPublisher;

    @Value("${seo.site-url:https://www.caskbycask.net}")
    private String siteUrl;

    public void publish(Post post) {
        if (post == null || post.getId() == null) return;
        if (!isIndexable(post)) return;
        String board = post.getBoardType() == null ? "free" : post.getBoardType().name().toLowerCase();
        eventPublisher.publishEvent(new IndexingEvent(
                "post",
                List.of(normalizedSiteUrl() + "/ko/community/" + board + "/" + post.getId())));
    }

    /**
     * 색인 통지 대상인가.
     * <p>
     * 조건은 sitemap 의 게시글 쿼리({@code SitemapService.generateContentSitemap})와 <b>같아야 한다</b> —
     * 한쪽만 바꾸면 sitemap 에서 뺀 주소를 IndexNow 로는 크롤해 달라고 조르는 상태가 된다.
     * 성인 전용·숨김 글을 검색엔진에 밀어 넣지 않기 위한 것이다.
     */
    private boolean isIndexable(Post post) {
        return post.getStatus() == PostStatus.ACTIVE
                && !Boolean.TRUE.equals(post.getIsHidden())
                && !Boolean.TRUE.equals(post.getAdultOnly());
    }

    private String normalizedSiteUrl() {
        return siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
    }
}
