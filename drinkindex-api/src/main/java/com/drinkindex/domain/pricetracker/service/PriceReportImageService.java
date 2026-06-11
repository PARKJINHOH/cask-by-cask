package com.drinkindex.domain.pricetracker.service;

import com.drinkindex.domain.pricetracker.dto.response.PriceReportImageUploadResponse;
import com.drinkindex.domain.pricetracker.entity.PriceReportImage;
import com.drinkindex.domain.pricetracker.repository.PriceReportImageRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.storage.ValidatedImageUploader;
import com.drinkindex.global.storage.ValidatedImageUploader.StoredImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class PriceReportImageService {

    private final PriceReportImageRepository priceReportImageRepository;
    private final UserRepository userRepository;
    private final ValidatedImageUploader validatedImageUploader;

    @Transactional
    public PriceReportImageUploadResponse uploadImage(MultipartFile file, Long uploaderId) {
        // [보안] 4단계 검증 + 연월별 디렉토리 저장 (공통 흐름)
        StoredImage stored = validatedImageUploader.upload(file, "price-reports");

        User uploader = userRepository.getByIdOrThrow(uploaderId);

        // priceReport=null: 가격 등록 전 임시 상태
        PriceReportImage image = PriceReportImage.builder()
                .uploadedBy(uploader)
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .subPath(stored.subPath())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .build();

        return PriceReportImageUploadResponse.from(priceReportImageRepository.save(image));
    }
}
