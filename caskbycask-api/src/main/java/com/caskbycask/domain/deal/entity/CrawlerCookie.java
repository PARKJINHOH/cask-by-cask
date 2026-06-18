package com.caskbycask.domain.deal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "crawler_cookies")
@Getter
@Setter
@NoArgsConstructor
public class CrawlerCookie {

    @Id
    private Long id = 1L; // 단일 레코드를 1로 고정하여 키-값 형태의 단일 행 관리

    @Column(name = "nid_aut", length = 500)
    private String nidAut;

    @Column(name = "nid_ses", length = 2000)
    private String nidSes;

    public CrawlerCookie(String nidAut, String nidSes) {
        this.nidAut = nidAut;
        this.nidSes = nidSes;
    }
}
