package com.caskbycask.domain.seo.controller;

import com.caskbycask.domain.seo.service.SitemapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

/**
 * SEO sitemap.xml 동적 생성.
 *
 * 노출 경로: GET /sitemap.xml  (nginx 가 /sitemap.xml → api 로 프록시)
 *
 * 캐시 정책: 1시간 (Cloudflare + nginx). 운영 spirit/notice/post 추가/수정
 * 반영 지연은 최대 1시간.
 */
@RestController
@RequiredArgsConstructor
public class SitemapController {

    private final SitemapService sitemapService;

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        String xml = sitemapService.generateSitemap();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(MediaType.APPLICATION_XML)
                .body(xml);
    }
}
