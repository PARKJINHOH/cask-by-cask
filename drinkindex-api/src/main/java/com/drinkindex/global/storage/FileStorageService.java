package com.drinkindex.global.storage;

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
     * 파일 삭제. savedFileName 기준.
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
