package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.SpiritImageResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.WebpConversionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpiritImageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/avif");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "avif");
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10MB

    @Value("${upload.path}")
    private String uploadPath;

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final WebpConversionService webpConversionService;

    @Transactional
    public SpiritImageResponse uploadImage(Long spiritId, MultipartFile file) {
        Spirit spirit = spiritRepository.findById(spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        validateImageFile(file);

        String filename = generateFilename(file.getOriginalFilename());
        String relativeUrl = saveFile(spiritId, filename, file);

        boolean isFirstImage = spiritImageRepository.findBySpiritId(spiritId).isEmpty();

        SpiritImage image = SpiritImage.builder()
                .spirit(spirit)
                .imageUrl(relativeUrl)
                .isPrimary(isFirstImage)
                .sortOrder(0)
                .build();

        return SpiritImageResponse.from(spiritImageRepository.save(image));
    }

    @Transactional
    public void deleteImage(Long spiritId, Long imageId) {
        SpiritImage image = spiritImageRepository.findByIdAndSpiritId(imageId, spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_IMAGE_NOT_FOUND));

        spiritImageRepository.delete(image);
    }

    @Transactional
    public SpiritImageResponse setPrimaryImage(Long spiritId, Long imageId) {
        if (!spiritRepository.existsById(spiritId)) {
            throw new CustomException(ErrorCode.SPIRIT_NOT_FOUND);
        }

        List<SpiritImage> images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId);
        SpiritImage target = images.stream()
                .filter(image -> image.getId().equals(imageId))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_IMAGE_NOT_FOUND));

        images.forEach(SpiritImage::unmarkAsPrimary);
        target.markAsPrimary();

        // 대표 이미지가 항상 첫 번째로 표시되도록 정렬 순서 재배치
        target.updateSortOrder(0);
        int order = 1;
        for (SpiritImage image : images) {
            if (image.getId().equals(imageId)) continue;
            image.updateSortOrder(order++);
        }

        return SpiritImageResponse.from(target);
    }

    @Transactional
    public List<SpiritImageResponse> reorderImages(Long spiritId, List<Long> imageIds) {
        if (!spiritRepository.existsById(spiritId)) {
            throw new CustomException(ErrorCode.SPIRIT_NOT_FOUND);
        }

        List<SpiritImage> images = spiritImageRepository.findBySpiritId(spiritId);
        Map<Long, SpiritImage> imagesById = images.stream()
                .collect(Collectors.toMap(SpiritImage::getId, Function.identity()));

        if (imageIds.size() != images.size() || !imagesById.keySet().containsAll(imageIds)) {
            throw new CustomException(ErrorCode.SPIRIT_IMAGE_NOT_FOUND);
        }

        for (int i = 0; i < imageIds.size(); i++) {
            SpiritImage image = imagesById.get(imageIds.get(i));
            image.updateSortOrder(i);
            if (i == 0) {
                image.markAsPrimary();
            } else {
                image.unmarkAsPrimary();
            }
        }

        return spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId)
                .stream()
                .map(SpiritImageResponse::from)
                .toList();
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ErrorCode.IMAGE_SIZE_EXCEEDED);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        }
        String ext = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        }
    }

    private String generateFilename(String originalFilename) {
        String ext = getExtension(originalFilename);
        return UUID.randomUUID() + "." + ext;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1);
    }

    private String saveFile(Long spiritId, String filename, MultipartFile file) {
        try {
            Path dir = Paths.get(uploadPath, "spirits", spiritId.toString());
            Files.createDirectories(dir);
            Path originalDest = dir.resolve(filename);
            file.transferTo(originalDest);

            // JPG/PNG → WebP 변환본 동시 저장. 실패 시 원본 URL 반환 (graceful degrade).
            String webpFilename = stripExt(filename) + ".webp";
            Path webpDest = dir.resolve(webpFilename);
            try {
                byte[] webpBytes = webpConversionService.toWebp(Files.readAllBytes(originalDest));
                Files.write(webpDest, webpBytes);
                return "/uploads/spirits/" + spiritId + "/" + webpFilename;
            } catch (Exception e) {
                log.warn("WebP 변환 실패, 원본 서빙으로 fallback: spiritId={}, filename={}", spiritId, filename, e);
                return "/uploads/spirits/" + spiritId + "/" + filename;
            }
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private String stripExt(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? name : name.substring(0, dot);
    }
}
