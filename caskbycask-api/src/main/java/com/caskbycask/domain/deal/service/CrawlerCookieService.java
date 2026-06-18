package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.dto.CrawlerCookieRequest;
import com.caskbycask.domain.deal.entity.CrawlerCookie;
import com.caskbycask.domain.deal.repository.CrawlerCookieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CrawlerCookieService {

    private final CrawlerCookieRepository crawlerCookieRepository;

    public CrawlerCookie getCookies() {
        return crawlerCookieRepository.findById(1L)
                .orElseGet(() -> crawlerCookieRepository.save(new CrawlerCookie("", "")));
    }

    @Transactional
    public void updateCookies(CrawlerCookieRequest request) {
        CrawlerCookie cookie = crawlerCookieRepository.findById(1L)
                .orElseGet(() -> new CrawlerCookie("", ""));
        cookie.setNidAut(request.getNidAut());
        cookie.setNidSes(request.getNidSes());
        crawlerCookieRepository.save(cookie);
    }
}
