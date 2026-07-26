package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.repository.SocialPublishBundleRepository;
import com.caskbycask.domain.social.service.SocialImageRenderService;
import com.caskbycask.domain.social.service.SocialPublicationQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SocialPublicControllerTest {

    private static final String SHORT_CODE = "K3LzALyFpv";

    private SocialPublishBundleRepository bundleRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        bundleRepository = mock(SocialPublishBundleRepository.class);
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setSiteUrl("https://www.caskbycask.net");
        mockMvc = MockMvcBuilders.standaloneSetup(new SocialPublicController(
                bundleRepository,
                mock(SocialPublicationQueryService.class),
                mock(SocialImageRenderService.class),
                properties
        )).build();
    }

    @Test
    void reviewShortLinkSupportsPlainAndLocalizedPaths() throws Exception {
        SocialPublishBundle bundle = SocialPublishBundle.builder()
                .originType(SocialSourceType.REVIEW)
                .originId(42L)
                .contentType(SocialSourceType.REVIEW)
                .contentId(42L)
                .locale("ko")
                .consentVersion("v1")
                .consentedAt(LocalDateTime.now())
                .mediaMode(SocialMediaMode.DIRECT_UPLOAD)
                .shortCode(SHORT_CODE)
                .build();
        when(bundleRepository.findByShortCode(SHORT_CODE)).thenReturn(Optional.of(bundle));

        for (String path : new String[]{
                "/s/" + SHORT_CODE,
                "/ko/s/" + SHORT_CODE,
                "/en/s/" + SHORT_CODE
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isFound())
                    .andExpect(header().string(
                            "Location",
                            "https://www.caskbycask.net/ko/reviews/42"
                    ));
        }
    }

    @Test
    void missingShortLinkRedirectsToUnavailablePage() throws Exception {
        when(bundleRepository.findByShortCode(SHORT_CODE)).thenReturn(Optional.empty());

        mockMvc.perform(get("/s/" + SHORT_CODE))
                .andExpect(status().isFound())
                .andExpect(header().string(
                        "Location",
                        "https://www.caskbycask.net/ko/social?unavailable=1"
                ));
    }
}
