package com.caskbycask.domain.spirit.controller;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import com.caskbycask.domain.spirit.service.WineRegionService;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 산지 카탈로그 엔드포인트 검증.
 * 공개 읽기 전용 참조 데이터이므로 비로그인 200 OK 여야 한다(SecurityConfig permitAll 등록 확인 포함).
 */
@WebMvcTest(controllers = WineRegionController.class)
@Import({SecurityConfig.class, WineRegionService.class})
class WineRegionControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean JwtProvider jwtProvider;
    @MockitoBean CustomUserDetailsService customUserDetailsService;

    @Test
    @DisplayName("GET /api/wine-regions — 비로그인 200 OK, category 미지정이면 와인 산지만 (하위 호환)")
    void getWineRegions_isPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/api/wine-regions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()")
                        .value(WineRegion.countryCodes(SpiritCategory.WINE).size()))
                .andExpect(jsonPath("$.data[?(@.countryCode == 'FR')]").exists())
                .andExpect(jsonPath("$.data[?(@.countryCode == 'AU')]").exists())
                .andExpect(jsonPath("$.data[?(@.countryCode == 'DE')]").exists())
                // 위스키 전용 국가는 기본 응답에 섞이지 않아야 한다
                .andExpect(jsonPath("$.data[?(@.countryCode == 'GB-SCT')]").doesNotExist())
                .andExpect(jsonPath("$.data[0].regions[0].code").value("FR_BORDEAUX"))
                .andExpect(jsonPath("$.data[0].regions[0].nameKo").value("보르도"))
                .andExpect(jsonPath("$.data[0].regions[0].parentCode").doesNotExist())
                .andExpect(jsonPath("$.data[0].regions[0].children[0].code").value("FR_BORDEAUX_MEDOC"))
                .andExpect(jsonPath("$.data[0].regions[0].children[0].nameKo").value("메독"))
                .andExpect(jsonPath("$.data[0].regions[0].children[0].parentCode").value("FR_BORDEAUX"));
    }

    @Test
    @DisplayName("GET /api/wine-regions?category=WHISKY — 스카치 산지를 반환한다")
    void getWhiskyRegions() throws Exception {
        mockMvc.perform(get("/api/wine-regions").param("category", "WHISKY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()")
                        .value(WineRegion.countryCodes(SpiritCategory.WHISKY).size()))
                .andExpect(jsonPath("$.data[?(@.countryCode == 'GB-SCT')]").exists())
                .andExpect(jsonPath("$.data[?(@.countryCode == 'JP')]").exists())
                // 프랑스는 위스키(브르타뉴)로도 등장하지만 와인 산지가 섞이면 안 된다
                .andExpect(jsonPath("$.data[?(@.countryCode == 'FR')].regions[?(@.code == 'FR_BORDEAUX')]")
                        .doesNotExist())
                // 와인 전용 국가는 위스키 응답에 없어야 한다
                .andExpect(jsonPath("$.data[?(@.countryCode == 'IT')]").doesNotExist())
                .andExpect(jsonPath("$.data[?(@.countryCode == 'PT')]").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/wine-regions?category=COGNAC — 꼬냑 크뤼를 반환한다")
    void getCognacRegions() throws Exception {
        mockMvc.perform(get("/api/wine-regions").param("category", "COGNAC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].countryCode").value("FR"))
                .andExpect(jsonPath("$.data[0].regions[0].code").value("FR_COGNAC"))
                .andExpect(jsonPath("$.data[0].regions[0].children[0].code")
                        .value("FR_COGNAC_GRANDE_CHAMPAGNE"));
    }
}
