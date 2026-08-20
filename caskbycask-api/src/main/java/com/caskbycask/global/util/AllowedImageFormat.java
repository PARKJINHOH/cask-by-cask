package com.caskbycask.global.util;

import lombok.Getter;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 업로드를 허용하는 이미지 포맷 표. 판별 기준은 <b>파일 내용(Magic Bytes)</b> 이며 확장자가 아니다.
 * <p>
 * 사용자는 메신저를 거치며 이름이 바뀐 파일, 확장자가 없는 파일, {@code .jfif} 처럼 낯선 확장자를
 * 그대로 올린다. 확장자와 내용이 어긋난다고 막으면 멀쩡한 사진이 거절되므로(네이버 카페·디시인사이드는
 * 받는다), 내용이 지원 포맷이면 받고 <b>저장 파일명의 확장자도 원본 이름이 아니라 여기 값</b>을 쓴다.
 * <p>
 * [보안] SVG 는 목록에 없다 — 내부에 script 를 품을 수 있어(XSS) 의도적으로 제외한다.
 * HEIC/TIFF 도 없다 — 브라우저가 그리지 못하는데 서버에도 디코더가 없어 변환 폴백이 통하지 않는다.
 * 둘 다 {@code NoticeImageValidator} 가 "왜 안 되는지"를 알려 주는 전용 에러코드로 거절한다.
 */
@Getter
public enum AllowedImageFormat {

    JPEG("image/jpeg", "jpg", "JPG"),
    PNG("image/png", "png", "PNG"),
    GIF("image/gif", "gif", "GIF"),
    WEBP("image/webp", "webp", "WEBP"),
    BMP("image/bmp", "bmp", "BMP"),
    AVIF("image/avif", "avif", "AVIF");

    private final String mimeType;
    private final String extension;
    private final String label;

    AllowedImageFormat(String mimeType, String extension, String label) {
        this.mimeType = mimeType;
        this.extension = extension;
        this.label = label;
    }

    public static Optional<AllowedImageFormat> ofMimeType(String mimeType) {
        return Arrays.stream(values())
                .filter(format -> format.mimeType.equals(mimeType))
                .findFirst();
    }

    /** 에러 메시지에 쓰는 "JPG, PNG, GIF, WEBP, BMP, AVIF" 문자열. */
    public static String labels() {
        return labelsExcept();
    }

    /**
     * 일부 포맷을 뺀 라벨 문자열. 도메인마다 받을 수 있는 포맷이 조금씩 다르다 —
     * 리뷰 사진은 저장 전에 반드시 WebP 로 다시 인코딩하는데 서버에 AVIF 디코더가 없어
     * AVIF 만 빼고 받는다(ReviewImageService 참고).
     */
    public static String labelsExcept(AllowedImageFormat... excluded) {
        Set<AllowedImageFormat> skip = excluded.length == 0
                ? EnumSet.noneOf(AllowedImageFormat.class)
                : EnumSet.copyOf(Arrays.asList(excluded));
        return Arrays.stream(values())
                .filter(format -> !skip.contains(format))
                .map(AllowedImageFormat::getLabel)
                .collect(Collectors.joining(", "));
    }
}
