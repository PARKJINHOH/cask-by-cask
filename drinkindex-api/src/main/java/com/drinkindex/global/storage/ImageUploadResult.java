package com.drinkindex.global.storage;

// 이미지 업로드 결과 — 변환 여부에 따라 DB 에 저장할 정보가 달라지므로
// 호출자는 이 결과를 사용해 NoticeImage/PopupImage 등 엔티티를 빌드한다.
//
// savedFileName: 브라우저에 서빙되는 파일명 (예: uuid.webp). 변환되지 않은 경우 원본 파일명.
// mimeType:      서빙되는 MIME 타입 (image/webp 또는 원본 MIME)
// imageUrl:      서빙 URL 경로
public record ImageUploadResult(
        String savedFileName,
        String mimeType,
        String imageUrl
) {}
