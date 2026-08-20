package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.response.PriceReportImageUploadResponse;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
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
        // [보안] 공통 검증(크기 → 내용 기반 포맷 판별 → UUID 파일명) + 연월별 디렉토리 저장
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
