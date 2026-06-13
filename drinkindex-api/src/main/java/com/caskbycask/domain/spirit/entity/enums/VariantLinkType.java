package com.caskbycask.domain.spirit.entity.enums;

/**
 * 연관 술(다른 배치·병입) 수동 오버라이드 종류.
 * 자동 연결(이름 일치)을 보정하기 위해 관리자가 지정한다.
 */
public enum VariantLinkType {
    /** 강제 포함 — 이름이 달라도 연관 술로 묶음 */
    MANUAL,
    /** 강제 제외 — 이름이 같아 자동 연결됐어도 숨김 */
    EXCLUDED
}
