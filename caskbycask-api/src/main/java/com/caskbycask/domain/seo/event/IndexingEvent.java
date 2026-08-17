package com.caskbycask.domain.seo.event;

import java.util.List;

/**
 * 색인 통지 대상 URL 묶음.
 * <p>
 * 주류와 커뮤니티 글은 발행 주체가 다르지만 IndexNow 로 보내는 절차는 같으므로 한 이벤트로 모은다.
 * {@code kind} 는 어느 도메인이 보낸 통지인지 로그에서 구분하기 위한 값이다.
 */
public record IndexingEvent(String kind, List<String> urls) {

    public IndexingEvent {
        urls = List.copyOf(urls);
    }
}
