package com.drinkindex.domain.pricetracker.service;

import com.drinkindex.domain.pricetracker.dto.response.PriceReportImageUploadResponse;
import com.drinkindex.domain.pricetracker.entity.PriceReportImage;
import com.drinkindex.domain.pricetracker.repository.PriceReportImageRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
import com.drinkindex.global.storage.ImageUploadResult;
import com.drinkindex.global.util.NoticeImageValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class PriceReportImageService {

    private final PriceReportImageRepository priceReportImageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NoticeImageValidator noticeImageValidator;

    @Transactional
    public PriceReportImageUploadResponse uploadImage(MultipartFile file, Long uploaderId) {
        // [보안] NoticeImageValidator 4단계 검증 재사용
        String mimeType = noticeImageValidator.validate(file);
        String originalSavedFileName = noticeImageValidator.generateSavedFileName(file.getOriginalFilename());

        String subPath = "price-reports/" + YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        ImageUploadResult result = fileStorageService.uploadImage(file, originalSavedFileName, subPath, mimeType);

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // priceReport=null: 가격 등록 전 임시 상태
        PriceReportImage image = PriceReportImage.builder()
                .uploadedBy(uploader)
                .originalFileName(file.getOriginalFilename())
                .savedFileName(result.savedFileName())
                .subPath(subPath)
                .mimeType(result.mimeType())
                .imageUrl(result.imageUrl())
                .build();

        return PriceReportImageUploadResponse.from(priceReportImageRepository.save(image));
    }
}
