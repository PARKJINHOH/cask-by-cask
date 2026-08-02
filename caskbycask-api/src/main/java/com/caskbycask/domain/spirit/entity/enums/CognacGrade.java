package com.caskbycask.domain.spirit.entity.enums;

public enum CognacGrade {
    /** 최소 2년 숙성 */
    VS,
    /** 최소 6년 숙성 — 2018년 BNIC 공식 재정비 등급 */
    NAPOLEON,
    /** 최소 4년 숙성 */
    VSOP,
    /** 최소 10년 숙성 */
    XO,
    /** 최소 14년 숙성 */
    XXO,
    /** 법정 최소 숙성연수가 따로 없는 하우스 표기 — XO 이상 프레스티지 레인지에 붙인다 (Rémy Martin/Camus/Frapin Extra) */
    EXTRA,
    /** 최소 30년 숙성 */
    HORS_DAGE
}
