package com.caskbycask.global.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * 파일 업로드. 반환값은 접근 가능한 imageUrl.
     * 구현체가 local이면 /api/notices/images/{savedFileName},
     * S3이면 https://bucket-url/... 형태.
     */
    String upload(MultipartFile file, String savedFileName, String subPath);

    /**
     * 이미지 업로드 + WebP 변환본 동시 저장 (dual-save).
     * - 원본(JPG/PNG/GIF/WEBP) 은 originalSavedFileName 으로 서버에 보관
     * - JPG/PNG 인 경우 같은 디렉토리에 {uuid}.webp 추가 저장, 브라우저는 .webp 를 받음
     * - GIF/WEBP 는 변환하지 않음 (애니메이션 보존, 이미 WebP)
     * - 변환 실패 시 graceful degrade: 원본 그대로 서빙
     *
     * @param file                    업로드된 MultipartFile
     * @param originalSavedFileName   원본 보관용 파일명 (예: uuid.png)
     * @param subPath                 저장 경로 (예: notices/202506)
     * @param detectedMimeType        Magic Bytes 로 검증된 MIME 타입
     * @return 서빙용 savedFileName / mimeType / imageUrl 을 담은 결과
     */
    ImageUploadResult uploadImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType
    );

    /**
     * 도메인 특성에 따라 WebP 변환 방식을 지정하는 이미지 업로드.
     * 별도 구현이 없는 스토리지는 기존 변환 방식을 사용한다.
     */
    default ImageUploadResult uploadImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType,
            WebpConversionMode conversionMode
    ) {
        return uploadImage(file, originalSavedFileName, subPath, detectedMimeType);
    }

    /**
     * 파일 삭제. savedFileName 기준.
     * 구현체는 dual-save 로 생성된 sibling 파일({uuid}.원본확장자) 도 함께 제거해야 한다.
     */
    void delete(String savedFileName, String subPath);

    /**
     * 로컬 파일을 Spring Resource로 반환 (local 프로파일 전용).
     * S3는 presigned URL 방식으로 직접 접근하므로 이 메서드를 호출하지 않음.
     */
    default Resource loadAsResource(String savedFileName, String subPath) {
        throw new UnsupportedOperationException("이 스토리지 구현체는 직접 파일 서빙을 지원하지 않습니다.");
    }
}
