package com.caskbycask.domain.deal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CrawlerCookieRequest {

    @NotBlank(message = "NID_AUT 는 필수 입력값입니다.")
    private String nidAut;

    @NotBlank(message = "NID_SES 는 필수 입력값입니다.")
    private String nidSes;

    public CrawlerCookieRequest(String nidAut, String nidSes) {
        this.nidAut = nidAut;
        this.nidSes = nidSes;
    }
}
