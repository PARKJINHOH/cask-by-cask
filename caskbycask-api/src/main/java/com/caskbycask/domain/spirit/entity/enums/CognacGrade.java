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
    HORS_DAGE,
    /**
     * 라벨에 BNIC 등급 표기가 <b>없는</b> 제품 — 큐베 이름만으로 판다.
     *
     * <p>Rémy Martin 1738 Accord Royal, Martell Cordon Bleu, Hennessy Paradis,
     * Louis XIII 처럼 하우스가 등급 위계 밖에 두려고 일부러 표기를 뺀 경우다.
     * 예외가 아니라 하나의 부류라서, 등록자가 등급을 지어내지 않도록 값으로 둔다.
     *
     * <p>값이 없는 것(null = 아직 모름)과 구분된다 — 이쪽은 "확인해 보니 표기가 없다"는 사실이다.
     * 위스키의 {@code isNas}(숙성 연수 미표기)와 같은 성격.
     */
    NO_STATEMENT
}
