package com.caskbycask.domain.deal.dto;

import com.caskbycask.domain.deal.entity.CrawlerCookie;
import lombok.Getter;

@Getter
public class CrawlerCookieResponse {

    private final String nidAut;
    private final String nidSes;

    public CrawlerCookieResponse(CrawlerCookie crawlerCookie) {
        this.nidAut = crawlerCookie != null ? crawlerCookie.getNidAut() : "";
        this.nidSes = crawlerCookie != null ? crawlerCookie.getNidSes() : "";
    }
}
