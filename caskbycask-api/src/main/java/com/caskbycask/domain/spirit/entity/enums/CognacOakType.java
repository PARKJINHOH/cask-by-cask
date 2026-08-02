package com.caskbycask.domain.spirit.entity.enums;

/**
 * 꼬냑 숙성에 쓰이는 <b>프렌치 오크 숲(원산지)</b>.
 *
 * <p>같은 프렌치 오크라도 숲마다 나뭇결 밀도가 달라 타닌 추출 속도와 향 기여가 달라진다.
 * 하우스가 한 숲만 쓰는 경우는 드물고 리무쟁·트롱세를 함께 쓰는 것이 일반적이라
 * 주류 상세에는 <b>복수</b>로 기록한다.
 *
 * <p>DB enum 컬럼이 아니라 {@code spirit_cognac_detail.extra_data} JSON 에
 * 문자열 배열로 저장되므로, 값 추가 시 마이그레이션은 필요 없다.
 */
public enum CognacOakType {
    /** 굵은 결 — 타닌 추출이 빠르고 강하다. 꼬냑 숙성의 주력 */
    LIMOUSIN,
    /** 촘촘한 결 — 추출이 느리고 섬세하다 */
    TRONCAIS,
    /** 트롱세를 포함하는 광역 산지 표기 */
    ALLIER,
    NEVERS,
    VOSGES,
    JUPILLES,
    BERTRANGES,
    /** 숲을 특정하지 않은 프렌치 오크 표기 */
    FRENCH_OAK,
    OTHER
}
