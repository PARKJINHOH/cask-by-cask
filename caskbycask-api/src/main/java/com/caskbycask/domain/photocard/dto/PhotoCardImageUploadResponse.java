package com.caskbycask.domain.photocard.dto;

/**
 * 포토카드 이미지 업로드 결과 (템플릿 미리보기 / UPLOAD 레이어 이미지 공용).
 * <p>
 * 템플릿 저장 시 {@code savedFileName}·{@code subPath} 를 함께 돌려주는 이유:
 * 저장 경로가 연월 디렉토리라 나중에 삭제할 때 URL 만으로는 파일을 찾을 수 없다.
 */
public record PhotoCardImageUploadResponse(
        String imageUrl,
        String savedFileName,
        String subPath
) {}
