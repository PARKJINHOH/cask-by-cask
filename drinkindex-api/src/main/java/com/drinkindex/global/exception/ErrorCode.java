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

    // Spirit
    SPIRIT_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_001", "술 정보를 찾을 수 없습니다."),
    SPIRIT_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_002", "이미지를 찾을 수 없습니다."),
    SPIRIT_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "SPIRIT_003", "등록 요청을 찾을 수 없습니다."),
    SPIRIT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "SPIRIT_004", "해당 술에 대한 접근 권한이 없습니다."),
    INVALID_IMAGE_FORMAT(HttpStatus.BAD_REQUEST, "SPIRIT_005", "JPG, PNG 형식의 이미지만 업로드할 수 있습니다."),
    IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "SPIRIT_006", "이미지 파일 크기는 10MB를 초과할 수 없습니다."),

    // Distillery
    DISTILLERY_NOT_FOUND(HttpStatus.NOT_FOUND, "DISTILLERY_001", "증류소 정보를 찾을 수 없습니다."),

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

    // Storage
    STORAGE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_001", "파일 저장 중 오류가 발생했습니다."),
    INVALID_FILE_PATH(HttpStatus.BAD_REQUEST, "STORAGE_002", "잘못된 파일 경로입니다."),

    // Common
    NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON_001", "리소스를 찾을 수 없습니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON_002", "입력값이 올바르지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_003", "서버 오류가 발생했습니다."),
    CONSTRAINT_VIOLATION(HttpStatus.CONFLICT, "COMMON_004", "연관된 데이터가 있어 삭제할 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
