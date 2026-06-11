package com.drinkindex.domain.score.constant;

/**
 * 코드에서 점수를 지급/차감할 때 사용하는 "시스템 액션 키" 상수.
 *
 * <p>액션 타입은 더 이상 enum 이 아니라 자유 문자열({@code String})입니다.
 * 관리자는 점수 설정 화면에서 임의의 액션 키를 추가/수정/삭제할 수 있습니다.
 * 다만 아래 상수들은 애플리케이션 코드가 직접 발생시키는 "시스템 액션"이므로,
 * 오타 방지·일관성을 위해 상수로 관리합니다.
 *
 * <p>여기 값은 과거 {@code ScoreActionType} enum 의 {@code name()} 과 동일하게 유지하여,
 * 기존 DB(score_config / score_history)에 저장된 값과 호환됩니다. 값을 바꾸지 마세요.
 */
public final class ScoreActions {

    private ScoreActions() {}

    public static final String POST_WRITE_GENERAL         = "POST_WRITE_GENERAL";
    public static final String POST_WRITE_QUESTION        = "POST_WRITE_QUESTION";
    public static final String POST_WRITE_REVIEW          = "POST_WRITE_REVIEW";
    public static final String POST_WRITE_SHARING         = "POST_WRITE_SHARING";
    public static final String POST_WRITE_DISTILLERY_TOUR = "POST_WRITE_DISTILLERY_TOUR";
    public static final String POST_WRITE_NOTICE          = "POST_WRITE_NOTICE";
    public static final String POST_DELETE                = "POST_DELETE";
    public static final String POST_LOCKED                = "POST_LOCKED";
    public static final String POST_LIKED                 = "POST_LIKED";
    public static final String COMMENT_WRITE              = "COMMENT_WRITE";
    public static final String SPIRIT_REVIEW_WRITE        = "SPIRIT_REVIEW_WRITE";
    public static final String SPIRIT_REQUEST             = "SPIRIT_REQUEST";
    public static final String SPIRIT_REQUEST_APPROVED    = "SPIRIT_REQUEST_APPROVED";
    public static final String WISHLIST_ADD               = "WISHLIST_ADD";
    public static final String ATTENDANCE                 = "ATTENDANCE";
    public static final String ATTENDANCE_STREAK_7        = "ATTENDANCE_STREAK_7";
    public static final String ATTENDANCE_STREAK_30       = "ATTENDANCE_STREAK_30";
    public static final String ADMIN_ADJUST               = "ADMIN_ADJUST";
    public static final String PRICE_REGISTER             = "PRICE_REGISTER";
    public static final String FEEDBACK_WRITE             = "FEEDBACK_WRITE";
    public static final String FEEDBACK_RESOLVED          = "FEEDBACK_RESOLVED";
}
