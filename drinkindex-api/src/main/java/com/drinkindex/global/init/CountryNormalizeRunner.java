package com.drinkindex.global.init;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * spirit/distillery/cognac_house/winery의 country 영문 표기를 한국어 표준 표기로 정규화.
 * 멱등(idempotent) — 매 부팅 시 실행해도 안전하며, 변경 row가 0이면 NOOP.
 */
@Slf4j
@Order(10)
@Component
@RequiredArgsConstructor
public class CountryNormalizeRunner implements ApplicationRunner {

    private final EntityManager em;

    /** 영문 표기 → 한국어 표준 표기 매핑. countryName.ts의 KO_TO_EN과 동기화 유지. */
    private static final Map<String, String> EN_TO_KO = buildMap();

    private static Map<String, String> buildMap() {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("Scotland",       "스코틀랜드");
        m.put("Japan",          "일본");
        m.put("United States",  "미국");
        m.put("USA",            "미국");
        m.put("Ireland",        "아일랜드");
        m.put("France",         "프랑스");
        m.put("Mexico",         "멕시코");
        m.put("Jamaica",        "자메이카");
        m.put("Russia",         "러시아");
        m.put("Netherlands",    "네덜란드");
        m.put("Sweden",         "스웨덴");
        m.put("Australia",      "호주");
        m.put("Taiwan",         "대만");
        m.put("India",          "인도");
        m.put("Canada",         "캐나다");
        m.put("Spain",          "스페인");
        m.put("Italy",          "이탈리아");
        m.put("China",          "중국");
        m.put("Germany",        "독일");
        m.put("United Kingdom", "영국");
        m.put("UK",             "영국");
        m.put("Denmark",        "덴마크");
        m.put("Finland",        "핀란드");
        return m;
    }

    private static final String[] TABLES = { "spirit", "distillery", "cognac_house", "winery" };

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int totalUpdated = 0;
        for (String table : TABLES) {
            int updatedForTable = 0;
            for (Map.Entry<String, String> e : EN_TO_KO.entrySet()) {
                int n = em.createNativeQuery(
                                "UPDATE " + table + " SET country = :ko WHERE country = :en")
                        .setParameter("ko", e.getValue())
                        .setParameter("en", e.getKey())
                        .executeUpdate();
                updatedForTable += n;
            }
            if (updatedForTable > 0) {
                log.info("[CountryNormalizeRunner] {} 테이블 {}건 정규화", table, updatedForTable);
            }
            totalUpdated += updatedForTable;
        }
        if (totalUpdated == 0) {
            log.debug("[CountryNormalizeRunner] 변경 사항 없음 (이미 정규화 완료)");
        } else {
            log.info("[CountryNormalizeRunner] 총 {}건 country 정규화 완료", totalUpdated);
        }
    }
}
