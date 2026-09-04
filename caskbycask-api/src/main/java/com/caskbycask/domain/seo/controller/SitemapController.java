package com.caskbycask.domain.seo.controller;

import com.caskbycask.domain.seo.service.SitemapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;

@RestController
@RequiredArgsConstructor
public class SitemapController {

    private final SitemapService sitemapService;

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemapIndex(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return xml(sitemapService.generateSitemapIndex(), ifNoneMatch);
    }

    @GetMapping(value = "/sitemaps/static.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> staticSitemap(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return xml(sitemapService.generateStaticSitemap(), ifNoneMatch);
    }

    @GetMapping(value = "/sitemaps/content-{bucket:\\d+}.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> contentSitemap(
            @PathVariable long bucket,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return xml(sitemapService.generateContentSitemap(bucket), ifNoneMatch);
    }

    @GetMapping(value = "/sitemaps/youtube.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> youtubeSitemap(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return xml(sitemapService.generateYoutubeSitemap(), ifNoneMatch);
    }

    @GetMapping(value = "/sitemaps/producers-{bucket:\\d+}.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> producerSitemap(
            @PathVariable long bucket,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return xml(sitemapService.generateProducerSitemap(bucket), ifNoneMatch);
    }

    @GetMapping(value = "/sitemaps/venues-{bucket:\\d+}.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> venueSitemap(
            @PathVariable long bucket,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return xml(sitemapService.generateVenueSitemap(bucket), ifNoneMatch);
    }

    @GetMapping(value = "/sitemaps/spirits-{lang:ko|en}-{bucket:\\d+}.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> spiritSitemap(
            @PathVariable String lang,
            @PathVariable long bucket,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return xml(sitemapService.generateSpiritSitemap(lang, bucket), ifNoneMatch);
    }

    private ResponseEntity<String> xml(String body, String ifNoneMatch) {
        String etag = etag(body);
        CacheControl cacheControl = CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic();
        if (matchesEtag(ifNoneMatch, etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .cacheControl(cacheControl)
                    .eTag(etag)
                    .build();
        }
        return ResponseEntity.ok()
                .cacheControl(cacheControl)
                .eTag(etag)
                .contentType(MediaType.APPLICATION_XML)
                .body(body);
    }

    private boolean matchesEtag(String ifNoneMatch, String etag) {
        if (ifNoneMatch == null || ifNoneMatch.isBlank()) return false;
        for (String candidate : ifNoneMatch.split(",")) {
            String trimmed = candidate.trim();
            if ("*".equals(trimmed) || etag.equals(trimmed) || ("W/" + etag).equals(trimmed)) {
                return true;
            }
        }
        return false;
    }

    private String etag(String body) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(body.getBytes(StandardCharsets.UTF_8));
            return "\"" + HexFormat.of().formatHex(digest) + "\"";
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
