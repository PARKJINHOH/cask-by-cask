package com.drinkindex.domain.spirit.service;

import com.drinkindex.domain.spirit.dto.SpiritImageResponse;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.SpiritImage;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritImageRepository;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpiritImageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png");
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10MB

    @Value("${upload.path}")
    private String uploadPath;

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;

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

        SpiritImage target = spiritImageRepository.findByIdAndSpiritId(imageId, spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_IMAGE_NOT_FOUND));

        spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(spiritId)
                .ifPresent(SpiritImage::unmarkAsPrimary);

        target.markAsPrimary();
        return SpiritImageResponse.from(target);
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
            Path dest = dir.resolve(filename);
            file.transferTo(dest);
            return "/uploads/spirits/" + spiritId + "/" + filename;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
