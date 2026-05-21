package com.drinkindex.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Auth
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "AUTH_002", "접근 권한이 없습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_003", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_004", "만료된 토큰입니다."),
    REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "AUTH_005", "리프레시 토큰을 찾을 수 없습니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_001", "사용자를 찾을 수 없습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "USER_002", "이미 사용 중인 이메일입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "USER_003", "이미 사용 중인 닉네임입니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "USER_004", "비밀번호가 올바르지 않습니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "USER_005", "이메일 인증이 필요합니다."),
    INVALID_VERIFICATION_CODE(HttpStatus.BAD_REQUEST, "USER_006", "인증 코드가 올바르지 않습니다."),
    VERIFICATION_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "USER_007", "인증 코드가 만료되었습니다. 재발송 후 다시 시도해주세요."),
    VERIFICATION_COOLDOWN(HttpStatus.TOO_MANY_REQUESTS, "USER_008", "잠시 후 다시 시도해주세요. (1분 대기)"),
    NICKNAME_CHANGE_TOO_SOON(HttpStatus.BAD_REQUEST, "USER_009", "닉네임은 60일에 한 번만 변경할 수 있습니다."),
    NICKNAME_FIXED(HttpStatus.BAD_REQUEST, "USER_010", "고정닉으로 설정되어 닉네임을 변경할 수 없습니다."),
    NICKNAME_ALREADY_FIXED(HttpStatus.CONFLICT, "USER_011", "이미 고정닉으로 설정된 계정입니다."),
    PROFILE_IMAGE_CHANGE_TOO_SOON(HttpStatus.BAD_REQUEST, "USER_012", "프로필 이미지는 30일에 한 번만 변경할 수 있습니다."),
    PROFILE_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "USER_013", "프로필 이미지 파일 크기는 2MB를 초과할 수 없습니다."),
    PROFILE_IMAGE_INVALID_FORMAT(HttpStatus.BAD_REQUEST, "USER_014", "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다."),
    PROFILE_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_015", "프로필 이미지를 찾을 수 없습니다."),
    ACCOUNT_INACTIVE(HttpStatus.FORBIDDEN, "USER_016", "비활성화된 계정입니다."),
    ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "USER_017", "계정이 정지되었습니다."),

    // Spirit
    SPIRIT_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_001", "술 정보를 찾을 수 없습니다."),
    SPIRIT_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_002", "이미지를 찾을 수 없습니다."),
    SPIRIT_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_003", "등록 요청을 찾을 수 없습니다."),
    SPIRIT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "SPIRIT_004", "해당 술에 대한 접근 권한이 없습니다."),
    INVALID_IMAGE_FORMAT(HttpStatus.BAD_REQUEST, "SPIRIT_005", "JPG, PNG 형식의 이미지만 업로드할 수 있습니다."),
    IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "SPIRIT_006", "이미지 파일 크기는 10MB를 초과할 수 없습니다."),
    INVALID_GRAPE_PERCENTAGE(HttpStatus.BAD_REQUEST, "SPIRIT_007", "포도 품종 비율 합계는 100%를 초과할 수 없습니다."),
    INVALID_DATE_FORMAT(HttpStatus.BAD_REQUEST, "SPIRIT_008", "날짜 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM)."),

    // Distillery
    DISTILLERY_NOT_FOUND(HttpStatus.NOT_FOUND, "DISTILLERY_001", "증류소 정보를 찾을 수 없습니다."),

    // Winery
    WINERY_NOT_FOUND(HttpStatus.NOT_FOUND, "WINERY_001", "와이너리 정보를 찾을 수 없습니다."),

    // CognacHouse
    COGNAC_HOUSE_NOT_FOUND(HttpStatus.NOT_FOUND, "COGNAC_HOUSE_001", "꼬냑 하우스 정보를 찾을 수 없습니다."),

    // CognacAppellation
    COGNAC_APPELLATION_NOT_FOUND(HttpStatus.NOT_FOUND, "COGNAC_APPELLATION_001", "꼬냑 세부 산지 정보를 찾을 수 없습니다."),

    // Review
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "REVIEW_001", "리뷰를 찾을 수 없습니다."),
    DUPLICATE_REVIEW(HttpStatus.CONFLICT, "REVIEW_002", "이미 해당 술에 리뷰를 작성하셨습니다."),
    REVIEW_ACCESS_DENIED(HttpStatus.FORBIDDEN, "REVIEW_003", "본인이 작성한 리뷰가 아닙니다."),

    // Comment
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_001", "댓글을 찾을 수 없습니다."),
    NESTED_REPLY_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "COMMENT_002", "대댓글에는 답글을 작성할 수 없습니다."),
    COMMENT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "COMMENT_003", "본인이 작성한 댓글이 아닙니다."),

    // Wishlist
    WISHLIST_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "WISHLIST_001", "위시리스트 항목을 찾을 수 없습니다."),
    WISHLIST_ACCESS_DENIED(HttpStatus.FORBIDDEN, "WISHLIST_002", "본인의 위시리스트만 삭제할 수 있습니다."),

    // Report
    ALREADY_REPORTED(HttpStatus.CONFLICT, "REPORT_001", "이미 신고한 항목입니다."),
    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "REPORT_002", "신고 내역을 찾을 수 없습니다."),
    TARGET_NOT_FOUND(HttpStatus.NOT_FOUND, "REPORT_003", "신고 대상을 찾을 수 없습니다."),

    // Notice
    NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTICE_001", "공지사항을 찾을 수 없습니다."),
    NOTICE_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTICE_002", "공지사항 이미지를 찾을 수 없습니다."),
    NOTICE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "NOTICE_003", "공지사항 접근 권한이 없습니다."),
    NOTICE_INVALID_IMAGE_FORMAT(HttpStatus.BAD_REQUEST, "NOTICE_004", "허용되지 않는 이미지 형식입니다. (JPG, JPEG, PNG, GIF, WEBP)"),
    NOTICE_INVALID_IMAGE_MAGIC_BYTES(HttpStatus.BAD_REQUEST, "NOTICE_005", "이미지 파일의 실제 형식이 확장자와 일치하지 않습니다."),
    NOTICE_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "NOTICE_006", "이미지 파일 크기는 10MB를 초과할 수 없습니다."),
    DELETE_USED_IMAGE(HttpStatus.BAD_REQUEST, "NOTICE_007", "공지에 사용 중인 이미지는 삭제할 수 없습니다."),

    // Popup
    POPUP_NOT_FOUND(HttpStatus.NOT_FOUND, "POPUP_001", "팝업을 찾을 수 없습니다."),
    POPUP_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "POPUP_002", "팝업 이미지를 찾을 수 없습니다."),
    DELETE_USED_POPUP_IMAGE(HttpStatus.BAD_REQUEST, "POPUP_003", "팝업에 사용 중인 이미지는 삭제할 수 없습니다."),
    INVALID_POPUP_DATE_RANGE(HttpStatus.BAD_REQUEST, "POPUP_004", "종료일시는 시작일시 이후여야 합니다."),
    POPUP_TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "POPUP_005", "팝업 타입에 맞는 필드를 입력해주세요."),
    POPUP_IMAGE_RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "POPUP_006", "이미지 업로드 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."),

    // Community - Poll
    POLL_NOT_FOUND(HttpStatus.NOT_FOUND, "POLL_001", "투표를 찾을 수 없습니다."),
    POLL_ENDED(HttpStatus.BAD_REQUEST, "POLL_002", "종료된 투표입니다."),
    ALREADY_VOTED(HttpStatus.BAD_REQUEST, "POLL_003", "이미 투표하셨습니다."),
    INVALID_VOTE(HttpStatus.BAD_REQUEST, "POLL_004", "투표 옵션이 올바르지 않습니다."),
    POLL_OPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "POLL_005", "투표 항목을 찾을 수 없습니다."),

    // Community - Emoji
    EMOJI_NOT_FOUND(HttpStatus.NOT_FOUND, "EMOJI_001", "이모지를 찾을 수 없습니다."),
    DUPLICATE_EMOJI_CODE(HttpStatus.CONFLICT, "EMOJI_002", "이미 등록된 이모지 코드입니다."),
    EMOJI_UNICODE_OR_IMAGE_REQUIRED(HttpStatus.BAD_REQUEST, "EMOJI_003", "유니코드 또는 이미지 URL 중 하나는 필수입니다."),
    EMOJI_GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "EMOJI_004", "이모지 그룹을 찾을 수 없습니다."),
    EMOJI_GROUP_IN_USE(HttpStatus.CONFLICT, "EMOJI_005", "해당 그룹에 속한 이모지가 있어 삭제할 수 없습니다."),

    // Community - Post
    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_001", "게시글을 찾을 수 없습니다."),
    POST_ACCESS_DENIED(HttpStatus.FORBIDDEN, "POST_002", "게시글 수정/삭제 권한이 없습니다."),
    POST_NOTICE_FORBIDDEN(HttpStatus.FORBIDDEN, "POST_003", "소식 게시판은 관리자 또는 증류소 계정만 작성할 수 있습니다."),
    POST_LOCKED(HttpStatus.FORBIDDEN, "POST_004", "신고가 누적되어 잠긴 게시글입니다."),
    POLL_OPTION_TOO_FEW(HttpStatus.BAD_REQUEST, "POST_005", "투표 항목은 최소 2개 이상이어야 합니다."),
    SERIES_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_006", "시리즈를 찾을 수 없습니다."),
    SERIES_ACCESS_DENIED(HttpStatus.FORBIDDEN, "POST_007", "본인이 생성한 시리즈에만 게시글을 추가할 수 있습니다."),
    SERIES_FORBIDDEN(HttpStatus.FORBIDDEN, "POST_013", "본인 시리즈만 수정할 수 있습니다."),

    // Community - Notification
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTI_001", "알림을 찾을 수 없습니다."),
    NOTIFICATION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "NOTI_002", "본인 알림에만 접근할 수 있습니다."),

    // Community - Message
    MESSAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "MSG_001", "쪽지를 찾을 수 없습니다."),
    MESSAGE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "MSG_002", "쪽지 접근 권한이 없습니다."),
    MESSAGE_BLOCKED(HttpStatus.FORBIDDEN, "MSG_003", "차단된 사용자에게 쪽지를 보낼 수 없습니다."),
    POST_PREFIX_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_008", "말머리를 찾을 수 없습니다."),
    SELF_REPORT_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "POST_009", "본인 게시글은 신고할 수 없습니다."),
    SELF_LIKE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "POST_014", "본인 게시글은 추천할 수 없습니다."),
    DELETED_POST_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_010", "삭제된 게시글을 찾을 수 없습니다."),
    DUPLICATE_REPORT(HttpStatus.CONFLICT, "POST_011", "이미 신고한 게시글입니다."),
    POST_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_012", "게시글 이미지를 찾을 수 없습니다."),

    // Community - BadWord
    BAD_WORD_DETECTED(HttpStatus.BAD_REQUEST, "BAD_WORD_DETECTED", "욕설이 포함되어 있습니다."),
    BAD_WORD_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMUNITY_001", "금지어를 찾을 수 없습니다."),
    DUPLICATE_BAD_WORD(HttpStatus.CONFLICT, "COMMUNITY_002", "이미 등록된 금지어입니다."),

    // Score
    SCORE_CONFIG_NOT_FOUND(HttpStatus.NOT_FOUND, "SCORE_001", "점수 설정을 찾을 수 없습니다."),
    LEVEL_CONFIG_NOT_FOUND(HttpStatus.NOT_FOUND, "SCORE_002", "레벨 설정을 찾을 수 없습니다."),
    CANNOT_DELETE_BASE_LEVEL(HttpStatus.BAD_REQUEST, "SCORE_003", "기본 레벨은 삭제할 수 없습니다."),

    // Legal
    LEGAL_DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "LEGAL_001", "등록된 법적 문서를 찾을 수 없습니다."),
    CANNOT_DELETE_ACTIVE_LEGAL_DOCUMENT(HttpStatus.BAD_REQUEST, "LEGAL_002", "현재 활성화된 문서는 삭제할 수 없습니다. 다른 버전을 먼저 활성화해주세요."),

    // Inquiry
    INQUIRY_NOT_FOUND(HttpStatus.NOT_FOUND, "INQUIRY_001", "문의를 찾을 수 없습니다."),
    INQUIRY_TOO_MANY_IMAGES(HttpStatus.BAD_REQUEST, "INQUIRY_002", "이미지는 최대 3개까지 첨부할 수 있습니다."),
    INQUIRY_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "INQUIRY_003", "이미지 파일 크기는 2MB를 초과할 수 없습니다."),
    INQUIRY_TOTAL_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "INQUIRY_004", "첨부 이미지 총 크기는 6MB를 초과할 수 없습니다."),
    INQUIRY_INVALID_IMAGE_FORMAT(HttpStatus.BAD_REQUEST, "INQUIRY_005", "JPG, PNG, WEBP, GIF 형식의 이미지만 첨부할 수 있습니다."),

    // Banner
    BANNER_NOT_FOUND(HttpStatus.NOT_FOUND, "BANNER_001", "배너를 찾을 수 없습니다."),
    BANNER_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "BANNER_002", "배너 이미지를 찾을 수 없습니다."),
    DELETE_USED_BANNER_IMAGE(HttpStatus.BAD_REQUEST, "BANNER_003", "배너에 사용 중인 이미지는 삭제할 수 없습니다."),

    // Storage
    STORAGE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_001", "파일 저장 중 오류가 발생했습니다."),
    INVALID_FILE_PATH(HttpStatus.BAD_REQUEST, "STORAGE_002", "잘못된 파일 경로입니다."),

    // RoleType
    ROLE_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "ROLE_001", "역할 타입을 찾을 수 없습니다."),
    ROLE_TYPE_IN_USE(HttpStatus.CONFLICT, "ROLE_002", "해당 역할을 사용 중인 계정이 있어 삭제할 수 없습니다."),
    DUPLICATE_VALUE(HttpStatus.CONFLICT, "ROLE_003", "이미 존재하는 값입니다."),

    // Common
    NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON_001", "리소스를 찾을 수 없습니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON_002", "입력값이 올바르지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_003", "서버 오류가 발생했습니다."),
    CONSTRAINT_VIOLATION(HttpStatus.CONFLICT, "COMMON_004", "연관된 데이터가 있어 삭제할 수 없습니다."),
    RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "COMMON_005", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
