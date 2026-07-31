package com.caskbycask.domain.review.controller;

import com.caskbycask.domain.review.dto.RecentReviewResponse;
import com.caskbycask.domain.review.service.PublicReviewService;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.security.CustomUserDetailsService;
import com.caskbycask.global.config.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 메인 "최근 등록된 리뷰" 엔드포인트 검증.
 * /recent 리터럴 경로가 /{reviewId} 템플릿보다 우선 매칭되는지, 비로그인으로 접근 가능한지 확인한다.
 */
@WebMvcTest(controllers = PublicReviewController.class)
@Import(SecurityConfig.class)
class PublicReviewControllerRecentTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean PublicReviewService publicReviewService;
    @MockitoBean JwtProvider jwtProvider;
    @MockitoBean CustomUserDetailsService customUserDetailsService;

    @Test
    @DisplayName("GET /api/public/reviews/recent — 비로그인 200 OK 및 리뷰 목록 반환")
    void getRecent_isPubliclyAccessible() throws Exception {
        given(publicReviewService.getRecent(10)).willReturn(List.of(sample()));

        mockMvc.perform(get("/api/public/reviews/recent").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(20))
                .andExpect(jsonPath("$.data[0].spiritId").value(2))
                .andExpect(jsonPath("$.data[0].displayNameKo").value("글렌피딕 12년 배치3"))
                .andExpect(jsonPath("$.data[0].imageUrl").value("/uploads/master.webp"))
                .andExpect(jsonPath("$.data[0].nickname").value("taster"));
    }

    @Test
    @DisplayName("GET /api/public/reviews/recent — size 미지정 시 서비스에 null 을 전달해 기본값 처리에 위임한다")
    void getRecent_withoutSizeDelegatesToService() throws Exception {
        given(publicReviewService.getRecent(null)).willReturn(List.of());

        mockMvc.perform(get("/api/public/reviews/recent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        verify(publicReviewService).getRecent(null);
    }

    @Test
    @DisplayName("recent 는 리뷰 상세(/{reviewId}) 경로로 잘못 매칭되지 않는다")
    void recentIsNotMatchedAsReviewIdPath() throws Exception {
        given(publicReviewService.getRecent(null)).willReturn(List.of());

        mockMvc.perform(get("/api/public/reviews/recent"))
                .andExpect(status().isOk());

        verify(publicReviewService, never()).get(anyLong());
    }

    private RecentReviewResponse sample() {
        return new RecentReviewResponse(
                20L,
                2L,
                "글렌피딕 12년 배치3",
                "Glenfiddich 12 Batch 3",
                "/ko/spirits/2-글렌피딕-12년-배치3",
                "/en/spirits/2-glenfiddich-12-batch-3",
                "/uploads/master.webp",
                "taster",
                new BigDecimal("80.0"),
                LocalDateTime.of(2026, 7, 31, 9, 0)
        );
    }
}
