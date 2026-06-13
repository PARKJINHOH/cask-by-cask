package com.caskbycask.global.util;

// [보안] SVG 명시적 차단: SVG는 내부에 script 태그 포함 가능 → XSS 벡터
public enum NoticeImageAllowedExtension {
    JPG, JPEG, PNG, GIF, WEBP
}
