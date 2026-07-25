package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.service.InvalidMetaSignedRequestException;
import com.caskbycask.domain.social.service.SocialMetaCallbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SocialMetaCallbackControllerTest {

    private SocialMetaCallbackService callbackService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        callbackService = mock(SocialMetaCallbackService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(
                new SocialMetaCallbackController(callbackService)).build();
    }

    @Test
    void readinessEndpointIsPubliclyCheckable() throws Exception {
        mockMvc.perform(get("/api/social/meta/threads/deauthorize"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ready"))
                .andExpect(jsonPath("$.platform").value("THREADS"));
    }

    @Test
    void dataDeletionReturnsMetaRequiredResponseShape() throws Exception {
        when(callbackService.deleteData(SocialPlatform.THREADS, "signed"))
                .thenReturn(new SocialMetaCallbackService.DeletionResult(
                        "https://www.caskbycask.net/api/social/meta/data-deletion/status/abc",
                        "abc"
                ));

        mockMvc.perform(post("/api/social/meta/threads/data-deletion")
                        .contentType("application/x-www-form-urlencoded")
                        .param("signed_request", "signed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(
                        "https://www.caskbycask.net/api/social/meta/data-deletion/status/abc"))
                .andExpect(jsonPath("$.confirmation_code").value("abc"));
    }

    @Test
    void invalidSignatureReturnsBadRequest() throws Exception {
        doThrow(new InvalidMetaSignedRequestException("invalid"))
                .when(callbackService)
                .deauthorize(SocialPlatform.THREADS, "invalid");

        mockMvc.perform(post("/api/social/meta/threads/deauthorize")
                        .contentType("application/x-www-form-urlencoded")
                        .param("signed_request", "invalid"))
                .andExpect(status().isBadRequest());
    }
}
