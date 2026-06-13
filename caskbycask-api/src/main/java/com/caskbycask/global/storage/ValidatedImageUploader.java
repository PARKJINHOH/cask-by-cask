package com.caskbycask.global.storage;

import com.caskbycask.global.util.NoticeImageValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

/**
 * 에디터/첨부 이미지 공통 업로드 흐름.
 * [보안] 4단계 검증(크기 → 확장자 → Magic Bytes → UUID 파일명) 후 연월별 디렉토리({directory}/yyyyMM)에 저장.
 * Notice/Post/Banner/Popup/PriceReport 이미지 업로드가 공유한다.
 */
@Component
@RequiredArgsConstructor
public class ValidatedImageUploader {

    private static final DateTimeFormatter MONTH_DIR = DateTimeFormatter.ofPattern("yyyyMM");

    private final NoticeImageValidator noticeImageValidator;
    private final FileStorageService fileStorageService;

    public StoredImage upload(MultipartFile file, String directory) {
        String mimeType = noticeImageValidator.validate(file);
        String savedFileName = noticeImageValidator.generateSavedFileName(file.getOriginalFilename());
        String subPath = directory + "/" + YearMonth.now().format(MONTH_DIR);
        ImageUploadResult result = fileStorageService.uploadImage(file, savedFileName, subPath, mimeType);
        return new StoredImage(result.savedFileName(), subPath, result.mimeType(), result.imageUrl());
    }

    /** 저장 결과 — savedFileName/mimeType/imageUrl 은 서빙 기준(ImageUploadResult 참고), subPath 는 저장 디렉토리 */
    public record StoredImage(String savedFileName, String subPath, String mimeType, String imageUrl) {}
}
