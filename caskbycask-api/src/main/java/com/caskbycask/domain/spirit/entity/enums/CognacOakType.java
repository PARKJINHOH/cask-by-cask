package com.caskbycask.domain.spirit.entity.enums;

/**
 * 꼬냑 숙성에 쓰이는 <b>프렌치 오크 산지</b>.
 *
 * <p>같은 프렌치 오크라도 자란 곳에 따라 나뭇결 밀도가 달라 타닌 추출 속도와 향 기여가 달라진다.
 * 한 곳만 쓰는 경우는 드물고 리무쟁·트롱세를 함께 쓰는 것이 일반적이라
 * 주류 상세에는 <b>복수</b>로 기록한다.
 *
 * <p>값은 <b>숲과 지방·데파르트망이 섞여</b> 있다 — 라벨·공식 자료의 표기가 그렇기 때문이다.
 * 층위도 겹친다(알리에 ⊃ 트롱세). 어느 쪽으로 표기됐는지 그대로 담는 것이 목적이므로
 * 하나로 정규화하지 않는다.
 *
 * <p>DB enum 컬럼이 아니라 {@code spirit_cognac_detail.extra_data} JSON 에
 * 문자열 배열로 저장되므로, 값 추가 시 마이그레이션은 필요 없다.
 */
public enum CognacOakType {
    /** 옛 리무쟁 지방 — 굵은 결(Quercus robur), 타닌 추출이 빠르고 강하다. 꼬냑 숙성의 주력 */
    LIMOUSIN,
    /** 알리에의 트롱세 숲 — 촘촘한 결(Quercus petraea), 추출이 느리고 섬세하다 */
    TRONCAIS,
    /** 알리에 데파르트망 — 트롱세 숲을 포함하는 넓은 표기 */
    ALLIER,
    NEVERS,
    VOSGES,
    JUPILLES,
    BERTRANGES,
    /** 산지를 특정하지 않은 프렌치 오크 표기 */
    FRENCH_OAK,
    OTHER
}
