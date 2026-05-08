package com.drinkindex.global.storage;

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
}
