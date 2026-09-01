package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.SpiritImageResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritImageVariantRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.WebpConversionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;
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
    private final SpiritImageVariantRepository spiritImageVariantRepository;
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

        String imageUrl = image.getImageUrl();
        // 이미지에 걸린 에디션 지정도 함께 지운다 — FK 가 없어 두면 고아 행이 남는다.
        spiritImageVariantRepository.deleteBySpiritImageId(imageId);
        spiritImageRepository.delete(image);
        deleteFilesAfterCommit(List.of(imageUrl));
    }

    @Transactional
    public void deleteImagesBySpiritId(Long spiritId) {
        List<SpiritImage> images = spiritImageRepository.findBySpiritId(spiritId);
        if (images.isEmpty()) {
            return;
        }

        List<String> imageUrls = images.stream()
                .map(SpiritImage::getImageUrl)
                .toList();

        spiritImageVariantRepository.deleteBySpiritImageIdIn(
                images.stream().map(SpiritImage::getId).toList());
        spiritImageRepository.deleteAll(images);
        deleteFilesAfterCommit(imageUrls);
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

    private void deleteFilesAfterCommit(Collection<String> imageUrls) {
        Runnable deleteTask = () -> imageUrls.forEach(this::deleteStoredImageFile);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteTask.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteTask.run();
            }
        });
    }

    private void deleteStoredImageFile(String imageUrl) {
        String urlPath = extractUrlPath(imageUrl);
        if (urlPath == null || !urlPath.startsWith("/uploads/")) {
            return;
        }

        Path basePath = Paths.get(uploadPath).toAbsolutePath().normalize();
        Path targetFile = basePath.resolve(urlPath.substring("/uploads/".length())).normalize();
        if (!targetFile.startsWith(basePath) || targetFile.getFileName() == null) {
            return;
        }

        deleteFileAndSiblingVariants(basePath, targetFile);
        deleteDirectoryIfEmpty(basePath, targetFile.getParent());
    }

    private String extractUrlPath(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        String value = imageUrl.trim();
        try {
            URI uri = URI.create(value);
            if (uri.getScheme() != null) {
                return uri.getPath();
            }
        } catch (IllegalArgumentException ignored) {
            // Fall through and treat the value as an already-relative URL path.
        }

        int queryStart = value.indexOf('?');
        if (queryStart >= 0) {
            value = value.substring(0, queryStart);
        }
        int fragmentStart = value.indexOf('#');
        if (fragmentStart >= 0) {
            value = value.substring(0, fragmentStart);
        }
        return value;
    }

    private void deleteFileAndSiblingVariants(Path basePath, Path targetFile) {
        try {
            Files.deleteIfExists(targetFile);
        } catch (IOException e) {
            log.warn("주류 이미지 파일 삭제 실패 (무시): {}", targetFile, e);
        }

        String baseName = stripExt(targetFile.getFileName().toString());
        Path dir = targetFile.getParent();
        if (baseName.isBlank() || dir == null || !dir.startsWith(basePath) || !Files.isDirectory(dir)) {
            return;
        }

        try (var stream = Files.newDirectoryStream(
                dir,
                path -> stripExt(path.getFileName().toString()).equals(baseName))) {
            for (Path path : stream) {
                Path normalized = path.normalize();
                if (!normalized.startsWith(basePath)) {
                    continue;
                }
                Files.deleteIfExists(normalized);
            }
        } catch (IOException e) {
            log.warn("주류 이미지 sibling 파일 삭제 실패 (무시): base={}, dir={}", baseName, dir, e);
        }
    }

    private void deleteDirectoryIfEmpty(Path basePath, Path dir) {
        if (dir == null || dir.equals(basePath) || !dir.startsWith(basePath) || !Files.isDirectory(dir)) {
            return;
        }

        try (var stream = Files.newDirectoryStream(dir)) {
            if (!stream.iterator().hasNext()) {
                Files.deleteIfExists(dir);
            }
        } catch (IOException e) {
            log.warn("빈 주류 이미지 디렉터리 삭제 실패 (무시): {}", dir, e);
        }
    }
}
