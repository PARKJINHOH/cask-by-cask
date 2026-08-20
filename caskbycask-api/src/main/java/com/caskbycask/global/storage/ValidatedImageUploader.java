package com.caskbycask.global.storage;

import com.caskbycask.global.util.NoticeImageValidator;
import com.caskbycask.global.util.NoticeImageValidator.ValidatedImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

/**
 * 에디터/첨부 이미지 공통 업로드 흐름.
 * [보안] 3단계 검증(크기 → 내용 기반 포맷 판별 → 판별된 포맷 확장자로 UUID 파일명) 후
 * 연월별 디렉토리({directory}/yyyyMM)에 저장. Notice/Post/Banner/Popup/PriceReport 이미지 업로드가 공유한다.
 */
@Component
@RequiredArgsConstructor
public class ValidatedImageUploader {

    private static final DateTimeFormatter MONTH_DIR = DateTimeFormatter.ofPattern("yyyyMM");

    private final NoticeImageValidator noticeImageValidator;
    private final FileStorageService fileStorageService;

    public StoredImage upload(MultipartFile file, String directory) {
        return upload(file, directory, WebpConversionMode.LOSSY);
    }

    public StoredImage uploadLossless(MultipartFile file, String directory) {
        return upload(file, directory, WebpConversionMode.LOSSLESS);
    }

    /**
     * 해상도 상한 + 반응형 축소본까지 함께 만드는 업로드.
     * 이미지 갤러리처럼 원본이 크고 목록에서는 작게 쓰이는 도메인이 사용한다.
     */
    public StoredImage uploadResponsive(MultipartFile file, String directory, ResponsiveImageSpec spec) {
        ValidatedImage validated = noticeImageValidator.inspect(file);
        String subPath = directory + "/" + YearMonth.now().format(MONTH_DIR);
        ImageUploadResult result = fileStorageService.uploadResponsiveImage(
                file,
                validated.savedFileName(),
                subPath,
                validated.mimeType(),
                WebpConversionMode.LOSSY,
                spec
        );
        return new StoredImage(result.savedFileName(), subPath, result.mimeType(), result.imageUrl());
    }

    private StoredImage upload(MultipartFile file, String directory, WebpConversionMode conversionMode) {
        ValidatedImage validated = noticeImageValidator.inspect(file);
        String subPath = directory + "/" + YearMonth.now().format(MONTH_DIR);
        ImageUploadResult result = fileStorageService.uploadImage(
                file,
                validated.savedFileName(),
                subPath,
                validated.mimeType(),
                conversionMode
        );
        return new StoredImage(result.savedFileName(), subPath, result.mimeType(), result.imageUrl());
    }

    /** 저장 결과 — savedFileName/mimeType/imageUrl 은 서빙 기준(ImageUploadResult 참고), subPath 는 저장 디렉토리 */
    public record StoredImage(String savedFileName, String subPath, String mimeType, String imageUrl) {}
}
