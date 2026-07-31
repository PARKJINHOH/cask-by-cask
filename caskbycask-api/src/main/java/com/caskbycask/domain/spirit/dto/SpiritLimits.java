package com.caskbycask.domain.spirit.dto;

/**
 * 주류 수치 데이터의 허용 범위 — 검증 애노테이션이 참조하는 단일 소스.
 *
 * <p>등록(Create)·수정(Update)·등록요청(RegisterRequest)·에디션(Variant) DTO 가 같은 값을 써야
 * "등록은 막히는데 수정은 통과"하는 구멍이 생기지 않는다. 애노테이션 인자에 들어가므로
 * 반드시 컴파일 타임 상수({@code static final})여야 한다.
 *
 * <p>프론트엔드에도 같은 값이 있다({@code caskbycask-web/src/domain/spirit/data/spiritLimits.ts}).
 * 한쪽만 바꾸면 어긋나므로 함께 수정할 것.
 */
public final class SpiritLimits {

    private SpiritLimits() {}

    /** 도수(%) — 물리적으로 100%를 넘을 수 없다 */
    public static final String ABV_MIN = "0.0";
    public static final String ABV_MAX = "100.0";

    /**
     * 용량(ml).
     *
     * <p>상한 30,000ml = 30L 은 실제 유통되는 가장 큰 병 포맷(Midas·Melchizedek)을 담는 값이다.
     * 이전 상한 100,000ml(100L)는 존재하지 않는 값이라 오타를 걸러내지 못했다.
     */
    public static final int VOLUME_ML_MIN = 1;
    public static final int VOLUME_ML_MAX = 30_000;

    /** 연도 — 빈티지·병입 등 */
    public static final int YEAR_MIN = 1800;
    public static final int YEAR_MAX = 2100;
}
