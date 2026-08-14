package com.caskbycask.domain.photocard.dto;

/**
 * 텍스트 레이어에 자동으로 채워 넣을 값의 출처.
 * <p>
 * 이 목록이 곧 화이트리스트다 — 클라이언트가 임의 문자열을 보내면 저장 단계에서 거부된다.
 * <b>GPS(촬영 위치)는 의도적으로 없다.</b> 사진에 남은 좌표가 본인도 모르게 이미지에 박히는 것을
 * 스키마 수준에서 막는다. 촬영 장소를 넣고 싶으면 {@link #USER_PLACE} 로 직접 입력한다.
 */
public enum PhotoCardBinding {
    /** 사용자가 직접 쓴 고정 문구 */
    NONE,

    // ── 사진 EXIF ──────────────────────────────
    EXIF_CAMERA,
    EXIF_LENS,
    EXIF_APERTURE,
    EXIF_SHUTTER,
    EXIF_ISO,
    EXIF_FOCAL_LENGTH,
    /** 35mm 환산 초점거리 — 휴대폰은 실제값(6.5mm)보다 이쪽이 사진 이야기에 맞는다. */
    EXIF_FOCAL_LENGTH_35,
    EXIF_SHOT_AT,
    /**
     * 촬영 위치(위경도).
     * 사진에 남은 좌표는 집·직장을 드러낼 수 있어, 편집기가 자동으로 넣지 않는다 —
     * 사용자가 EXIF 목록에서 직접 ＋ 를 눌렀을 때만 레이어로 추가된다.
     */
    EXIF_GPS,

    // ── 주류 ───────────────────────────────────
    SPIRIT_NAME_KO,
    SPIRIT_NAME_EN,
    SPIRIT_ABV,
    SPIRIT_VOLUME,
    SPIRIT_VINTAGE,
    SPIRIT_CATEGORY,
    SPIRIT_REGION,
    SPIRIT_DETAIL,

    // ── 생산자(증류소·와이너리·꼬냑하우스) ────
    PRODUCER_NAME_KO,
    PRODUCER_NAME_EN,
    PRODUCER_COUNTRY,

    // ── 리뷰 공유 카드 ──────────────────────────
    REVIEW_TOTAL_SCORE,
    REVIEW_NOSE_SCORE,
    REVIEW_TASTE_SCORE,
    REVIEW_FINISH_SCORE,
    REVIEW_NOSE_NOTE,
    REVIEW_TASTE_NOTE,
    REVIEW_FINISH_NOTE,
    REVIEW_OVERALL,
    REVIEW_AROMA_NOSE,
    REVIEW_AROMA_TASTE,
    REVIEW_AROMA_FINISH,
    REVIEW_ATTRIBUTION,

    // ── 사용자 입력 ────────────────────────────
    USER_PLACE,
    USER_MEMO,
    USER_DATE
}
