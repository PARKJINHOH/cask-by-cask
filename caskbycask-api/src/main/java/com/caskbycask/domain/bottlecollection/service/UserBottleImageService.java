package com.caskbycask.domain.bottlecollection.service;

import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.bottlecollection.entity.UserBottleImage;
import com.caskbycask.domain.bottlecollection.repository.UserBottleImageRepository;
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
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserBottleImageService {

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/avif");
    private static final Set<String> ALLOWED_EXTS = Set.of("jpg", "jpeg", "png", "webp", "avif");
    private static final long MAX_SIZE = 10L * 1024 * 1024;

    @Value("${upload.path}")
    private String uploadPath;

    private final UserBottleService userBottleService;
    private final UserBottleImageRepository userBottleImageRepository;
    private final WebpConversionService webpConversionService;

    @Transactional
    public void uploadImage(Long bottleId, Long userId, MultipartFile file) {
        UserBottle bottle = userBottleService.findAndValidateOwner(bottleId, userId);

        if (userBottleImageRepository.countByUserBottleId(bottleId) >= 2) {
            throw new CustomException(ErrorCode.BOTTLE_IMAGE_LIMIT_EXCEEDED);
        }
        validateFile(file);

        String ext = getExt(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "." + ext;
        String relativeUrl = saveFile(bottleId, filename, file);
        int sortOrder = bottle.getImages().size();

        userBottleImageRepository.save(UserBottleImage.builder()
            .userBottle(bottle).imageUrl(relativeUrl).sortOrder(sortOrder).build());
    }

    @Transactional
    public void deleteImage(Long bottleId, Long imageId, Long userId) {
        userBottleService.findAndValidateOwner(bottleId, userId);
        UserBottleImage image = userBottleImageRepository.findByIdAndUserBottleId(imageId, bottleId)
            .orElseThrow(() -> new CustomException(ErrorCode.BOTTLE_IMAGE_NOT_FOUND));
        deletePhysicalFile(image.getImageUrl());
        userBottleImageRepository.delete(image);
    }

    @Transactional
    public void replaceImage(Long bottleId, Long imageId, Long userId, MultipartFile file) {
        userBottleService.findAndValidateOwner(bottleId, userId);
        UserBottleImage image = userBottleImageRepository.findByIdAndUserBottleId(imageId, bottleId)
            .orElseThrow(() -> new CustomException(ErrorCode.BOTTLE_IMAGE_NOT_FOUND));
        validateFile(file);

        String ext = getExt(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "." + ext;
        String oldUrl = image.getImageUrl();
        String relativeUrl = saveFile(bottleId, filename, file);
        image.replaceImageUrl(relativeUrl);
        deletePhysicalFile(oldUrl);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        if (file.getSize() > MAX_SIZE) throw new CustomException(ErrorCode.IMAGE_SIZE_EXCEEDED);
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_TYPES.contains(ct.toLowerCase()))
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
        if (!ALLOWED_EXTS.contains(getExt(file.getOriginalFilename()).toLowerCase()))
            throw new CustomException(ErrorCode.INVALID_IMAGE_FORMAT);
    }

    private String saveFile(Long bottleId, String filename, MultipartFile file) {
        try {
            Path dir = Paths.get(uploadPath, "bottles", bottleId.toString());
            Files.createDirectories(dir);
            try {
                byte[] webp = webpConversionService.toWebp(file.getBytes());
                String webpName = filename.replaceAll("\\.[^.]+$", ".webp");
                Files.write(dir.resolve(webpName), webp);
                return "/uploads/bottles/" + bottleId + "/" + webpName;
            } catch (Exception e) {
                log.warn("WebP conversion failed, saving original: {}", e.getMessage());
                Files.write(dir.resolve(filename), file.getBytes());
                return "/uploads/bottles/" + bottleId + "/" + filename;
            }
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private void deletePhysicalFile(String imageUrl) {
        try {
            String relativePath = imageUrl.startsWith("/uploads/")
                ? imageUrl.substring("/uploads/".length())
                : imageUrl.replaceFirst("^/+", "");
            Path filePath = Paths.get(uploadPath, relativePath);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Failed to delete bottle image file: {}", imageUrl);
        }
    }

    private String getExt(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1);
    }
}
