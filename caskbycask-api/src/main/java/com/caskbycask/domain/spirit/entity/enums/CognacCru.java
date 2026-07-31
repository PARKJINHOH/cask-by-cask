package com.caskbycask.domain.spirit.entity.enums;

/**
 * 꼬냑 크뤼(원산지 등급) — 꼬냑 AOC 가 정한 <b>법정 6개 구역</b>.
 *
 * <p>토양의 백악질(chalk) 비율에 따라 나뉘며 그랑드 샹파뉴가 최상위다.
 * 산지 지도의 세부 산지({@code FR_COGNAC_*})와 1:1 대응한다.
 */
public enum CognacCru {
    /** 최상위 크뤼 — 가장 섬세하고 품질 높은 포도 토양 */
    GRANDE_CHAMPAGNE,
    PETITE_CHAMPAGNE,
    BORDERIES,
    FINS_BOIS,
    BONS_BOIS,
    /** 가장 외곽 크뤼 — 'Bois à Terroirs' 로도 표기된다 */
    BOIS_ORDINAIRES
}
