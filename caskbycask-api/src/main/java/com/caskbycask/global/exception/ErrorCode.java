package com.caskbycask.global.exception;

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
    PROFILE_IMAGE_CHANGE_TOO_SOON(HttpStatus.BAD_REQUEST, "USER_012", "프로필 이미지는 1일에 한 번만 변경할 수 있습니다."),
    PROFILE_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "USER_013", "프로필 이미지 파일 크기는 2MB를 초과할 수 없습니다."),
    PROFILE_IMAGE_INVALID_FORMAT(HttpStatus.BAD_REQUEST, "USER_014", "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다."),
    PROFILE_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_015", "프로필 이미지를 찾을 수 없습니다."),
    ACCOUNT_INACTIVE(HttpStatus.FORBIDDEN, "USER_016", "비활성화된 계정입니다."),
    ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "USER_017", "계정이 정지되었습니다."),
    ACCOUNT_DORMANT(HttpStatus.FORBIDDEN, "USER_018", "휴면 계정입니다. 이메일 인증 후 휴면을 해제해주세요."),
    ACCOUNT_LOCKED(HttpStatus.TOO_MANY_REQUESTS, "USER_019", "비밀번호를 여러 번 틀려 계정이 잠겼습니다. 잠시 후 다시 시도해주세요."),
    ALREADY_ADULT_VERIFIED(HttpStatus.CONFLICT, "USER_020", "이미 성인인증이 완료된 계정입니다."),
    ADULT_VERIFY_UNDERAGE(HttpStatus.BAD_REQUEST, "USER_021", "만 19세 미만은 성인인증을 완료할 수 없습니다."),
    INVALID_BIRTH_DATE(HttpStatus.BAD_REQUEST, "USER_022", "생년월일이 올바르지 않습니다."),
    ADULT_VERIFICATION_REQUIRED(HttpStatus.FORBIDDEN, "USER_023", "성인인증이 필요한 기능입니다."),

    // OAuth (소셜 로그인)
    OAUTH_PROVIDER_ERROR(HttpStatus.BAD_GATEWAY, "OAUTH_001", "소셜 로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."),
    OAUTH_STATE_INVALID(HttpStatus.BAD_REQUEST, "OAUTH_002", "잘못된 요청입니다. 소셜 로그인을 다시 시도해주세요."),
    OAUTH_TICKET_EXPIRED(HttpStatus.BAD_REQUEST, "OAUTH_003", "소셜 로그인 세션이 만료되었습니다. 처음부터 다시 시도해주세요."),
    OAUTH_ALREADY_LINKED(HttpStatus.CONFLICT, "OAUTH_004", "이미 다른 계정에 연동된 소셜 계정입니다."),
    OAUTH_LAST_LOGIN_METHOD(HttpStatus.BAD_REQUEST, "OAUTH_005", "마지막 로그인 수단은 해제할 수 없습니다. 비밀번호를 먼저 설정해주세요."),
    OAUTH_EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "OAUTH_006", "이메일 입력과 인증이 필요합니다."),
    OAUTH_PROVIDER_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "OAUTH_007", "현재 사용할 수 없는 소셜 로그인입니다."),
    OAUTH_REDIRECT_URI_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "OAUTH_008", "허용되지 않은 리다이렉트 주소입니다."),

    // Spirit
    SPIRIT_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_001", "술 정보를 찾을 수 없습니다."),
    SPIRIT_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_002", "이미지를 찾을 수 없습니다."),
    SPIRIT_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_003", "등록 요청을 찾을 수 없습니다."),
    SPIRIT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "SPIRIT_004", "해당 술에 대한 접근 권한이 없습니다."),
    SPIRIT_REQUEST_ACCESS_DENIED(HttpStatus.FORBIDDEN, "SPIRIT_007", "본인이 등록한 요청만 수정/삭제할 수 있습니다."),
    SPIRIT_REQUEST_NOT_EDITABLE(HttpStatus.BAD_REQUEST, "SPIRIT_008", "검토 중이거나 반려된 요청만 수정/삭제할 수 있습니다."),
    SPIRIT_REQUEST_TOO_MANY_IMAGES(HttpStatus.BAD_REQUEST, "SPIRIT_012", "사진은 최대 3장까지 첨부할 수 있습니다."),
    SPIRIT_VARIANT_SELF_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "SPIRIT_009", "자기 자신은 연관 술로 추가할 수 없습니다."),
    INVALID_IMAGE_FORMAT(HttpStatus.BAD_REQUEST, "SPIRIT_005", "JPG, PNG 형식의 이미지만 업로드할 수 있습니다."),
    IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "SPIRIT_006", "이미지 파일 크기는 10MB를 초과할 수 없습니다."),
    INVALID_GRAPE_PERCENTAGE(HttpStatus.BAD_REQUEST, "SPIRIT_010", "포도 품종 비율 합계는 100%를 초과할 수 없습니다."),
    INVALID_DATE_FORMAT(HttpStatus.BAD_REQUEST, "SPIRIT_011", "날짜 형식이 올바르지 않습니다 (YYYY 또는 YYYY-MM)."),
    INVALID_CRU_PERCENTAGE(HttpStatus.BAD_REQUEST, "SPIRIT_013", "크뤼 구성 비율 합계는 100%를 초과할 수 없습니다."),
    DUPLICATE_CRU_COMPOSITION(HttpStatus.BAD_REQUEST, "SPIRIT_014", "같은 크뤼를 중복해서 입력할 수 없습니다."),

    // Producer
    DISTILLERY_NOT_FOUND(HttpStatus.NOT_FOUND, "DISTILLERY_001", "증류소 정보를 찾을 수 없습니다."),
    DISTILLERY_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "DISTILLERY_002", "증류소 등록 요청을 찾을 수 없습니다."),
    DISTILLERY_REQUEST_NOT_EDITABLE(HttpStatus.BAD_REQUEST, "DISTILLERY_003", "이미 처리된 등록 요청입니다."),
    DISTILLERY_LOGO_COUNT_EXCEEDED(HttpStatus.BAD_REQUEST, "DISTILLERY_004", "로고 이미지는 최대 5장까지 등록할 수 있습니다."),
    DISTILLERY_LOGO_NOT_FOUND(HttpStatus.NOT_FOUND, "DISTILLERY_005", "로고 이미지를 찾을 수 없습니다."),

    // Winery
    WINERY_NOT_FOUND(HttpStatus.NOT_FOUND, "WINERY_001", "와이너리 정보를 찾을 수 없습니다."),

    // CognacHouse
    COGNAC_HOUSE_NOT_FOUND(HttpStatus.NOT_FOUND, "COGNAC_HOUSE_001", "꼬냑 하우스 정보를 찾을 수 없습니다."),

    // Review
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "REVIEW_001", "리뷰를 찾을 수 없습니다."),
    DUPLICATE_REVIEW(HttpStatus.CONFLICT, "REVIEW_002", "이미 해당 술에 리뷰를 작성하셨습니다."),
    REVIEW_ACCESS_DENIED(HttpStatus.FORBIDDEN, "REVIEW_003", "본인이 작성한 리뷰가 아닙니다."),
    REVIEW_IMAGE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "REVIEW_004", "리뷰 이미지는 최대 3장까지 등록할 수 있습니다."),
    REVIEW_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "REVIEW_005", "리뷰 이미지 파일은 장당 10MB를 초과할 수 없습니다."),
    REVIEW_IMAGE_TOTAL_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "REVIEW_006", "리뷰 이미지 총 용량은 30MB를 초과할 수 없습니다."),
    REVIEW_IMAGE_INVALID_FORMAT(HttpStatus.BAD_REQUEST, "REVIEW_007", "JPG, PNG, WEBP 형식의 이미지만 등록할 수 있습니다."),
    REVIEW_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "REVIEW_008", "리뷰 이미지를 찾을 수 없습니다."),
    REVIEW_IMAGE_DIMENSIONS_EXCEEDED(HttpStatus.BAD_REQUEST, "REVIEW_009", "리뷰 이미지는 4천만 픽셀을 초과할 수 없습니다."),
    REVIEW_IMAGE_PLAN_INVALID(HttpStatus.BAD_REQUEST, "REVIEW_010", "리뷰 이미지 변경 정보가 올바르지 않습니다."),
    REVIEW_AROMA_PROFILE_INVALID(HttpStatus.BAD_REQUEST, "REVIEW_011", "아로마 프로파일 정보가 올바르지 않습니다."),
    REVIEW_AROMA_PROFILE_UNSUPPORTED(HttpStatus.BAD_REQUEST, "REVIEW_012", "이 주류 카테고리는 아로마 프로파일을 지원하지 않습니다."),

    // Comment
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_001", "댓글을 찾을 수 없습니다."),
    NESTED_REPLY_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "COMMENT_002", "대댓글에는 답글을 작성할 수 없습니다."),
    COMMENT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "COMMENT_003", "본인이 작성한 댓글이 아닙니다."),

    // Wishlist
    WISHLIST_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "WISHLIST_001", "위시리스트 항목을 찾을 수 없습니다."),
    WISHLIST_ACCESS_DENIED(HttpStatus.FORBIDDEN, "WISHLIST_002", "본인의 위시리스트만 삭제할 수 있습니다."),

    // Bottle Collection
    BOTTLE_NOT_FOUND(HttpStatus.NOT_FOUND, "BOTTLE_001", "바틀을 찾을 수 없습니다."),
    BOTTLE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "BOTTLE_002", "본인의 바틀만 수정/삭제할 수 있습니다."),
    BOTTLE_IMAGE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "BOTTLE_003", "이미지는 최대 2장까지 등록할 수 있습니다."),
    BOTTLE_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "BOTTLE_004", "이미지를 찾을 수 없습니다."),

    // Tier List
    TIER_LIST_NOT_FOUND(HttpStatus.NOT_FOUND, "TIER_001", "티어리스트를 찾을 수 없습니다."),
    TIER_LIST_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "TIER_002", "티어리스트 이미지를 찾을 수 없습니다."),
    TIER_LIST_DRAFT_NOT_FOUND(HttpStatus.NOT_FOUND, "TIER_003", "임시 티어리스트를 찾을 수 없습니다."),
    TIER_LIST_DRAFT_EXPIRED(HttpStatus.GONE, "TIER_004", "임시 티어리스트가 만료되었습니다."),

    // Whisky Taste Tree
    TASTE_TREE_NOT_FOUND(HttpStatus.NOT_FOUND, "TASTE_TREE_001", "위스키 취향 트리를 찾을 수 없습니다."),
    TASTE_TREE_VERSION_NOT_FOUND(HttpStatus.NOT_FOUND, "TASTE_TREE_002", "트리 버전을 찾을 수 없습니다."),
    TASTE_TREE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "TASTE_TREE_003", "트리를 수정할 권한이 없습니다."),
    TASTE_TREE_INVALID_STRUCTURE(HttpStatus.BAD_REQUEST, "TASTE_TREE_004", "트리 연결 구조가 올바르지 않습니다."),
    TASTE_TREE_RESULT_NOT_FOUND(HttpStatus.NOT_FOUND, "TASTE_TREE_005", "취향 트리 결과를 찾을 수 없습니다."),
    TASTE_TREE_ALREADY_PUBLISHED(HttpStatus.CONFLICT, "TASTE_TREE_006", "이미 게시된 트리 버전입니다."),
    TASTE_TREE_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "TASTE_TREE_007", "트리 이미지를 찾을 수 없습니다."),

    // PhotoCard (포토카드 템플릿)
    PHOTO_CARD_TEMPLATE_NOT_FOUND(HttpStatus.NOT_FOUND, "PHOTO_CARD_001", "포토카드 템플릿을 찾을 수 없습니다."),
    PHOTO_CARD_TEMPLATE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "PHOTO_CARD_002", "템플릿을 수정할 권한이 없습니다."),
    PHOTO_CARD_TEMPLATE_INVALID_LAYOUT(HttpStatus.BAD_REQUEST, "PHOTO_CARD_003", "포토카드 배치 정보가 올바르지 않습니다."),
    PHOTO_CARD_TEMPLATE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "PHOTO_CARD_004", "저장할 수 있는 템플릿 개수를 초과했습니다."),
    PHOTO_CARD_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "PHOTO_CARD_005", "포토카드 이미지를 찾을 수 없습니다."),
    PHOTO_CARD_DRAFT_NOT_FOUND(HttpStatus.NOT_FOUND, "PHOTO_CARD_006", "임시저장을 찾을 수 없습니다. 보관 기간이 지났을 수 있습니다."),
    PHOTO_CARD_DRAFT_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "PHOTO_CARD_007", "임시저장은 최대 5개까지 보관할 수 있습니다. 기존 임시저장을 삭제 후 다시 시도해주세요."),
    PHOTO_CARD_DRAFT_TOO_LARGE(HttpStatus.BAD_REQUEST, "PHOTO_CARD_008", "임시저장할 내용이 너무 큽니다."),

    // Report
    ALREADY_REPORTED(HttpStatus.CONFLICT, "REPORT_001", "이미 신고한 항목입니다."),
    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "REPORT_002", "신고 내역을 찾을 수 없습니다."),
    CANNOT_REPORT_OWN_CONTENT(HttpStatus.BAD_REQUEST, "REPORT_004", "본인이 작성한 콘텐츠는 신고할 수 없습니다."),
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
    POST_VIDEO_INVALID_FORMAT(HttpStatus.BAD_REQUEST, "POST_016", "MP4 또는 WebM 형식의 동영상만 업로드할 수 있습니다."),
    POST_VIDEO_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "POST_017", "동영상 파일 크기는 50MB를 초과할 수 없습니다."),
    POST_VIDEO_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_018", "동영상을 찾을 수 없습니다."),
    POST_IMAGE_COUNT_EXCEEDED(HttpStatus.BAD_REQUEST, "POST_019", "이미지는 게시글당 최대 20장까지 첨부할 수 있습니다."),
    POST_VIDEO_COUNT_EXCEEDED(HttpStatus.BAD_REQUEST, "POST_020", "동영상은 게시글당 최대 2개까지 첨부할 수 있습니다."),
    POST_MEDIA_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "POST_021", "이미지·동영상 합계 용량은 게시글당 100MB를 초과할 수 없습니다."),
    POST_IMAGE_DIMENSIONS_EXCEEDED(HttpStatus.BAD_REQUEST, "POST_022", "이미지는 4천만 픽셀을 초과할 수 없습니다."),
    // [패치 9] 증류소 담당자는 본인 담당 증류소만 태그 가능
    POST_DISTILLERY_TAG_FORBIDDEN(HttpStatus.FORBIDDEN, "POST_015", "본인이 담당하는 증류소만 태그할 수 있습니다."),

    // Community - BadWord
    BAD_WORD_DETECTED(HttpStatus.BAD_REQUEST, "BAD_WORD_DETECTED", "욕설이 포함되어 있습니다."),
    BAD_WORD_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMUNITY_001", "금지어를 찾을 수 없습니다."),
    DUPLICATE_BAD_WORD(HttpStatus.CONFLICT, "COMMUNITY_002", "이미 등록된 금지어입니다."),

    // Nickname BadWord
    NICKNAME_BAD_WORD_DETECTED(HttpStatus.BAD_REQUEST, "NICKNAME_BAD_WORD_DETECTED", "닉네임에 사용할 수 없는 단어가 포함되어 있습니다."),
    NICKNAME_BAD_WORD_NOT_FOUND(HttpStatus.NOT_FOUND, "NICKNAME_BAD_WORD_001", "닉네임 금지 단어를 찾을 수 없습니다."),
    DUPLICATE_NICKNAME_BAD_WORD(HttpStatus.CONFLICT, "NICKNAME_BAD_WORD_002", "이미 등록된 닉네임 금지 단어입니다."),

    // Score
    SCORE_CONFIG_NOT_FOUND(HttpStatus.NOT_FOUND, "SCORE_001", "점수 설정을 찾을 수 없습니다."),
    LEVEL_CONFIG_NOT_FOUND(HttpStatus.NOT_FOUND, "SCORE_002", "레벨 설정을 찾을 수 없습니다."),
    CANNOT_DELETE_BASE_LEVEL(HttpStatus.BAD_REQUEST, "SCORE_003", "기본 레벨은 삭제할 수 없습니다."),
    SCORE_CONFIG_DUPLICATE(HttpStatus.CONFLICT, "SCORE_004", "이미 등록된 액션의 점수 설정입니다."),

    // Legal
    LEGAL_DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "LEGAL_001", "등록된 법적 문서를 찾을 수 없습니다."),
    CANNOT_DELETE_ACTIVE_LEGAL_DOCUMENT(HttpStatus.BAD_REQUEST, "LEGAL_002", "현재 활성화된 문서는 삭제할 수 없습니다. 다른 버전을 먼저 활성화해주세요."),
    CANNOT_EDIT_ACTIVE_LEGAL_DOCUMENT(HttpStatus.BAD_REQUEST, "LEGAL_003", "현재 활성화된 문서는 수정할 수 없습니다. 새 버전을 생성해 활성화해주세요."),

    // Inquiry
    INQUIRY_NOT_FOUND(HttpStatus.NOT_FOUND, "INQUIRY_001", "문의를 찾을 수 없습니다."),
    INQUIRY_TOO_MANY_ATTACHMENTS(HttpStatus.BAD_REQUEST, "INQUIRY_002", "파일은 최대 3개까지 첨부할 수 있습니다."),
    INQUIRY_ATTACHMENT_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "INQUIRY_003", "첨부파일 크기는 파일당 5MB를 초과할 수 없습니다."),
    INQUIRY_TOTAL_ATTACHMENT_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "INQUIRY_004", "첨부파일 총 크기는 15MB를 초과할 수 없습니다."),
    INQUIRY_INVALID_ATTACHMENT_FORMAT(HttpStatus.BAD_REQUEST, "INQUIRY_005", "허용되지 않거나 실제 형식과 확장자가 다른 첨부파일입니다."),
    INQUIRY_BODY_REQUIRED(HttpStatus.BAD_REQUEST, "INQUIRY_006", "문의 내용을 입력해주세요."),
    INQUIRY_BODY_TOO_LONG(HttpStatus.BAD_REQUEST, "INQUIRY_007", "문의 내용은 5,000자를 초과할 수 없습니다."),
    INQUIRY_ATTACHMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "INQUIRY_008", "첨부파일을 찾을 수 없습니다."),

    // Banner
    BANNER_NOT_FOUND(HttpStatus.NOT_FOUND, "BANNER_001", "배너를 찾을 수 없습니다."),
    BANNER_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "BANNER_002", "배너 이미지를 찾을 수 없습니다."),
    DELETE_USED_BANNER_IMAGE(HttpStatus.BAD_REQUEST, "BANNER_003", "배너에 사용 중인 이미지는 삭제할 수 없습니다."),
    BANNER_IMAGE_RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "BANNER_004", "이미지 업로드 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."),

    // Storage
    STORAGE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_001", "파일 저장 중 오류가 발생했습니다."),
    INVALID_FILE_PATH(HttpStatus.BAD_REQUEST, "STORAGE_002", "잘못된 파일 경로입니다."),

    // Store (Price Tracker)
    STORE_NOT_FOUND(HttpStatus.NOT_FOUND, "STORE_001", "매장 정보를 찾을 수 없습니다."),
    STORE_ALREADY_APPROVED(HttpStatus.BAD_REQUEST, "STORE_002", "이미 승인된 매장입니다."),

    // Price Report
    PRICE_REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "PRICE_001", "가격 등록 정보를 찾을 수 없습니다."),
    PRICE_REPORT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "PRICE_002", "가격 등록 접근 권한이 없습니다."),
    PRICE_REPORT_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "PRICE_003", "이미지를 찾을 수 없거나 접근 권한이 없습니다."),
    DUPLICATE_PRICE_REPORT_REPORT(HttpStatus.BAD_REQUEST, "PRICE_004", "이미 신고한 가격 등록입니다."),
    EXCHANGE_RATE_REQUIRED(HttpStatus.BAD_REQUEST, "PRICE_005", "외화 자동 환산 시 환율이 필요합니다."),
    EXCHANGE_RATE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "PRICE_006", "최신 환율을 불러올 수 없습니다. 원화 직접 입력을 이용해주세요."),

    // BYOB
    BYOB_NOT_FOUND(HttpStatus.NOT_FOUND, "BYOB_001", "BYOB 모임을 찾을 수 없습니다."),
    BYOB_ACCESS_DENIED(HttpStatus.FORBIDDEN, "BYOB_002", "BYOB 모임 접근 권한이 없습니다."),
    BYOB_HAS_APPROVED_PARTICIPANT(HttpStatus.BAD_REQUEST, "BYOB_003", "승인된 참여자가 있어 수정/삭제할 수 없습니다."),
    BYOB_PARTICIPANT_NOT_FOUND(HttpStatus.NOT_FOUND, "BYOB_004", "참여자 정보를 찾을 수 없습니다."),
    BYOB_ALREADY_APPLIED(HttpStatus.CONFLICT, "BYOB_005", "이미 신청한 모임입니다."),
    BYOB_NOT_OPEN(HttpStatus.BAD_REQUEST, "BYOB_006", "모집 중인 모임에만 신청할 수 있습니다."),
    BYOB_FULL(HttpStatus.BAD_REQUEST, "BYOB_007", "정원이 초과되었습니다."),
    BYOB_HOST_CANNOT_APPLY(HttpStatus.BAD_REQUEST, "BYOB_008", "주최자는 본인 모임에 신청할 수 없습니다."),
    BYOB_CANNOT_CANCEL(HttpStatus.BAD_REQUEST, "BYOB_009", "대기 중인 신청만 취소할 수 있습니다."),
    BYOB_INVALID_STATUS_TRANSITION(HttpStatus.BAD_REQUEST, "BYOB_010", "잘못된 상태 전환입니다."),
    BYOB_INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "BYOB_011", "모집 종료일은 시작일 이후여야 합니다."),
    BYOB_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "BYOB_012", "댓글을 찾을 수 없습니다."),
    BYOB_HOST_COMMENT_MUST_REPLY(HttpStatus.BAD_REQUEST, "BYOB_013", "주최자는 기존 댓글에 답글만 작성할 수 있습니다."),
    BYOB_PARTICIPANT_CANNOT_REPLY(HttpStatus.BAD_REQUEST, "BYOB_014", "참여자는 답글을 작성할 수 없습니다."),

    // Event (이벤트 달력)
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "EVENT_001", "이벤트를 찾을 수 없습니다."),

    // Draft (임시저장)
    DRAFT_NOT_FOUND(HttpStatus.NOT_FOUND, "DRAFT_001", "임시저장을 찾을 수 없습니다."),
    DRAFT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "DRAFT_002", "본인의 임시저장만 접근할 수 있습니다."),
    DRAFT_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "DRAFT_003", "임시저장은 최대 10개까지 저장할 수 있습니다. 기존 임시저장을 삭제 후 다시 시도해주세요."),

    // Feedback (개선·문의 — 이슈 트래커형, 이메일 문의(Inquiry)와 별개)
    FEEDBACK_NOT_FOUND(HttpStatus.NOT_FOUND, "FEEDBACK_001", "개선·문의 글을 찾을 수 없습니다."),
    FEEDBACK_FORBIDDEN(HttpStatus.FORBIDDEN, "FEEDBACK_002", "본인 또는 관리자만 접근할 수 있습니다."),
    FEEDBACK_NOT_EDITABLE(HttpStatus.BAD_REQUEST, "FEEDBACK_003", "접수 상태에서만 수정/삭제할 수 있습니다."),
    FEEDBACK_TOO_MANY_IMAGES(HttpStatus.BAD_REQUEST, "FEEDBACK_004", "이미지는 최대 3개까지 첨부할 수 있습니다."),
    FEEDBACK_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "FEEDBACK_005", "이미지 파일 크기는 2MB를 초과할 수 없습니다."),
    FEEDBACK_TOTAL_IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "FEEDBACK_006", "첨부 이미지 총 크기는 6MB를 초과할 수 없습니다."),
    FEEDBACK_INVALID_IMAGE_FORMAT(HttpStatus.BAD_REQUEST, "FEEDBACK_007", "JPG, PNG, WEBP, GIF 형식의 이미지만 첨부할 수 있습니다."),

    // Deal (가격 동향 — 크롤러 자동수집 + 관리자 직접 등록)
    DEAL_NOT_FOUND(HttpStatus.NOT_FOUND, "DEAL_001", "가격 정보를 찾을 수 없습니다."),
    DEAL_ALREADY_EXISTS(HttpStatus.CONFLICT, "DEAL_002", "이미 등록된 가격 정보입니다."),
    DEAL_ALREADY_PROCESSED(HttpStatus.CONFLICT, "DEAL_003", "이미 처리된 가격 정보입니다. 검토 대기 상태에서만 승인/반려할 수 있습니다."),
    DEAL_CURRENCY_NOT_SUPPORTED(HttpStatus.BAD_REQUEST, "DEAL_004", "관리자 직접 등록은 원화(KRW)만 지원합니다. 외화 가격은 환율 환산이 필요하므로 가격 제보 승인 경로를 이용해주세요."),

    // AI News
    AI_NEWS_NOT_FOUND(HttpStatus.NOT_FOUND, "AI_NEWS_001", "AI 소식 원고를 찾을 수 없습니다."),
    AI_NEWS_DUPLICATE(HttpStatus.CONFLICT, "AI_NEWS_002", "이미 수집되었거나 발행된 동일 주제의 글입니다."),
    AI_NEWS_INVALID_STATUS(HttpStatus.CONFLICT, "AI_NEWS_003", "현재 상태에서는 요청한 작업을 수행할 수 없습니다."),
    AI_NEWS_SETTINGS_NOT_FOUND(HttpStatus.NOT_FOUND, "AI_NEWS_004", "AI 소식 설정을 찾을 수 없습니다."),
    AI_NEWS_TOPIC_NOT_FOUND(HttpStatus.NOT_FOUND, "AI_NEWS_005", "AI 정보 글 주제를 찾을 수 없습니다."),
    AI_NEWS_SOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "AI_NEWS_006", "AI 소식 출처 설정을 찾을 수 없습니다."),
    AI_NEWS_BUDGET_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "AI_NEWS_007", "AI 소식 월간 사용 한도를 초과했습니다."),
    AI_NEWS_EVIDENCE_INSUFFICIENT(HttpStatus.BAD_REQUEST, "AI_NEWS_008", "자동 발행에 필요한 출처 근거가 부족합니다."),
    AI_NEWS_SYSTEM_AUTHOR_NOT_FOUND(HttpStatus.SERVICE_UNAVAILABLE, "AI_NEWS_009", "AI 소식 시스템 작성자 계정이 준비되지 않았습니다."),
    AI_NEWS_TOPIC_IN_USE(HttpStatus.CONFLICT, "AI_NEWS_010", "이미 생성된 원고가 연결된 정보 주제는 삭제할 수 없습니다."),

    // Wine ingestion (Vivino)
    WINE_INGEST_SETTINGS_NOT_FOUND(HttpStatus.NOT_FOUND, "WINE_INGEST_001", "와인 수집 설정을 찾을 수 없습니다."),
    WINE_INGEST_RUN_NOT_FOUND(HttpStatus.NOT_FOUND, "WINE_INGEST_002", "와인 수집 실행을 찾을 수 없습니다."),
    WINE_INGEST_HOURLY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "WINE_INGEST_003",
            "최근 1시간 수집 예약량을 모두 사용했습니다. 잠시 후 다시 시도해주세요."),
    WINE_INGEST_FIXTURE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "WINE_INGEST_004",
            "오프라인 테스트 수집은 한 번에 최대 3건까지 요청할 수 있습니다."),
    WINE_INGEST_ITEM_NOT_PUBLISHABLE(HttpStatus.CONFLICT, "WINE_INGEST_005",
            "'등록 성공' 상태의 수집 건만 공개할 수 있습니다."),
    WINE_INGEST_KOREAN_NAME_REQUIRED(HttpStatus.BAD_REQUEST, "WINE_INGEST_006",
            "마스터에 영문명과 다른 국문명을 입력한 뒤 공개할 수 있습니다."),

    // Instagram / Threads publishing
    SOCIAL_PUBLICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "SOCIAL_001", "SNS 게시 이력을 찾을 수 없습니다."),
    SOCIAL_PUBLICATION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "SOCIAL_002", "본인의 SNS 게시 이력만 접근할 수 있습니다."),
    SOCIAL_PUBLICATION_NOT_RETRYABLE(HttpStatus.CONFLICT, "SOCIAL_003", "확인된 실패 상태의 게시물만 다시 발행할 수 있습니다."),
    SOCIAL_TEMPLATE_NOT_FOUND(HttpStatus.NOT_FOUND, "SOCIAL_004", "사용 가능한 SNS 썸네일 배경을 찾을 수 없습니다."),
    SOCIAL_TEMPLATE_REQUIRED(HttpStatus.BAD_REQUEST, "SOCIAL_005", "SNS 썸네일 배경을 선택해주세요."),
    SOCIAL_IMAGE_REQUIRED(HttpStatus.BAD_REQUEST, "SOCIAL_006", "SNS 게시용 이미지를 등록해주세요."),
    SOCIAL_MEDIA_MODE_REQUIRED(HttpStatus.BAD_REQUEST, "SOCIAL_007", "SNS 썸네일 생성 방식을 선택해주세요."),
    SOCIAL_ACCOUNT_NOT_CONNECTED(HttpStatus.SERVICE_UNAVAILABLE, "SOCIAL_008", "공식 SNS 계정이 연결되지 않았습니다."),
    SOCIAL_OAUTH_STATE_INVALID(HttpStatus.BAD_REQUEST, "SOCIAL_009", "SNS 계정 연결 요청이 만료되었거나 유효하지 않습니다."),
    SOCIAL_PUBLISHING_DISABLED(HttpStatus.SERVICE_UNAVAILABLE, "SOCIAL_010", "SNS 자동 게시 기능이 아직 활성화되지 않았습니다."),
    SOCIAL_INITIAL_PUBLISH_NOT_ALLOWED(HttpStatus.CONFLICT, "SOCIAL_011", "이 리뷰는 수정 화면에서 SNS 최초 게시를 요청할 수 없습니다."),
    SOCIAL_PUBLICATION_NOT_REPUBLISHABLE(HttpStatus.CONFLICT, "SOCIAL_012", "게시 완료 또는 외부 삭제 상태의 SNS 게시물만 재등록할 수 있습니다."),
    SOCIAL_EDITOR_IMAGE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "SOCIAL_013",
            "SNS 썸네일을 포함하려면 Instagram 본문 이미지는 최대 9장, Threads 본문 이미지는 최대 19장까지 게시할 수 있습니다."),

    // YouTube gallery
    YOUTUBE_CHANNEL_NOT_FOUND(HttpStatus.NOT_FOUND, "YOUTUBE_001", "유튜브 채널을 찾을 수 없습니다."),
    YOUTUBE_CHANNEL_DUPLICATE(HttpStatus.CONFLICT, "YOUTUBE_002", "이미 등록된 유튜브 채널입니다."),
    YOUTUBE_CHANNEL_URL_INVALID(HttpStatus.BAD_REQUEST, "YOUTUBE_003",
            "유튜브 채널 주소를 해석하지 못했습니다. 채널 홈의 핸들(@...) 또는 채널 ID(UC...)를 입력해주세요."),
    YOUTUBE_CHANNEL_UNRESOLVED(HttpStatus.BAD_REQUEST, "YOUTUBE_004",
            "유튜브에서 채널을 찾지 못했습니다. 핸들이 정확한지 확인하거나 채널 ID(UC...)로 등록해주세요."),
    YOUTUBE_VIDEO_NOT_FOUND(HttpStatus.NOT_FOUND, "YOUTUBE_005", "유튜브 영상을 찾을 수 없습니다."),
    YOUTUBE_VIDEO_DUPLICATE(HttpStatus.CONFLICT, "YOUTUBE_006", "이미 등록된 유튜브 영상입니다."),
    YOUTUBE_VIDEO_URL_INVALID(HttpStatus.BAD_REQUEST, "YOUTUBE_007",
            "유튜브 영상 주소를 해석하지 못했습니다."),
    YOUTUBE_VIDEO_UNRESOLVED(HttpStatus.BAD_REQUEST, "YOUTUBE_008",
            "유튜브에서 영상 정보를 읽지 못했습니다. 비공개 영상이 아닌지 확인해주세요."),
    YOUTUBE_PERMISSION_REQUIRED(HttpStatus.BAD_REQUEST, "YOUTUBE_009",
            "채널 운영자의 게재 허락을 확인해야 갤러리에 노출할 수 있습니다."),

    // Common
    NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON_001", "리소스를 찾을 수 없습니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON_002", "입력값이 올바르지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_003", "서버 오류가 발생했습니다."),
    CONSTRAINT_VIOLATION(HttpStatus.CONFLICT, "COMMON_004", "연관된 데이터가 있어 삭제할 수 없습니다."),
    RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "COMMON_005", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "COMMON_006", "지원하지 않는 요청 방식입니다."),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "COMMON_007", "지원하지 않는 미디어 타입입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
