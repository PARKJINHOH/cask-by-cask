package com.caskbycask.global.util;

import org.jsoup.Jsoup;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * HTML 본문에서 사용 중인 이미지 URL(img[src]) 추출 유틸.
 * Notice/Post/Banner/Popup 등 에디터 기반 콘텐츠의 이미지 사용 현황 동기화에 공통 사용.
 */
public final class HtmlImageUrlExtractor {

    private HtmlImageUrlExtractor() {
    }

    public static Set<String> extract(String htmlContent) {
        return Jsoup.parse(htmlContent).select("img[src]").stream()
                .map(el -> el.attr("src"))
                .filter(src -> !src.isBlank())
                .collect(Collectors.toSet());
    }
}
