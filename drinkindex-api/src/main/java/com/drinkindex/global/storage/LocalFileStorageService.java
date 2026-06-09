package com.drinkindex.global.storage;

import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;

@Slf4j
@Service
@Profile({"local", "dev", "prod", "test"})
public class LocalFileStorageService implements FileStorageService {

    private final Path basePath;
    private final WebpConversionService webpConversionService;

    public LocalFileStorageService(
            @Value("${storage.local.base-path}") String basePathStr,
            WebpConversionService webpConversionService
    ) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
        this.webpConversionService = webpConversionService;
    }

    @Override
    public String upload(MultipartFile file, String savedFileName, String subPath) {
        Path targetDir  = resolveAndValidate(subPath, null);
        Path targetFile = resolveAndValidate(subPath, savedFileName);

        try {
            Files.createDirectories(targetDir);
            file.transferTo(targetFile.toFile());
        } catch (IOException e) {
            log.error("파일 저장 실패: {}", targetFile, e);
            throw new CustomException(ErrorCode.STORAGE_ERROR);
        }

        return buildUrl(subPath, savedFileName);
    }

    @Override
    public ImageUploadResult uploadImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType
    ) {
        Path targetDir  = resolveAndValidate(subPath, null);
        Path originalPath = resolveAndValidate(subPath, originalSavedFileName);

        try {
            Files.createDirectories(targetDir);
            // 원본을 서버에 보관 (브라우저는 직접 접근하지 않음)
            file.transferTo(originalPath.toFile());
        } catch (IOException e) {
            log.error("원본 이미지 저장 실패: {}", originalPath, e);
            throw new CustomException(ErrorCode.STORAGE_ERROR);
        }

        // JPG/PNG → WebP 변환본 추가 저장. 실패 시 graceful degrade (원본 서빙).
        if (webpConversionService.isConvertibleMime(detectedMimeType)) {
            String webpFileName = stripExtension(originalSavedFileName) + ".webp";
            Path webpPath = resolveAndValidate(subPath, webpFileName);
            try {
                byte[] webpBytes = webpConversionService.toWebp(Files.readAllBytes(originalPath));
                Files.write(webpPath, webpBytes);
                return new ImageUploadResult(webpFileName, "image/webp", buildUrl(subPath, webpFileName));
            } catch (Exception e) {
                log.warn("WebP 변환 실패, 원본 서빙으로 fallback: {}", originalSavedFileName, e);
                // 변환 실패해도 원본은 이미 저장되었으므로 원본 URL 반환
            }
        }

        return new ImageUploadResult(
                originalSavedFileName,
                detectedMimeType,
                buildUrl(subPath, originalSavedFileName)
        );
    }

    @Override
    public Resource loadAsResource(String savedFileName, String subPath) {
        Path file = resolveAndValidate(subPath, savedFileName);
        try {
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new CustomException(ErrorCode.NOTICE_IMAGE_NOT_FOUND);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new CustomException(ErrorCode.STORAGE_ERROR);
        }
    }

    @Override
    public void delete(String savedFileName, String subPath) {
        Path targetFile = resolveAndValidate(subPath, savedFileName);
        try {
            Files.deleteIfExists(targetFile);
        } catch (IOException e) {
            log.warn("파일 삭제 실패 (무시): {}", targetFile, e);
        }

        // dual-save 로 생성된 sibling (원본 보관 파일) 제거.
        // savedFileName 이 uuid.webp 면 디렉토리에서 uuid.* 형태 파일을 모두 정리.
        String base = stripExtension(savedFileName);
        Path dir = targetFile.getParent();
        if (dir == null || !Files.isDirectory(dir)) return;
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir, base + ".*")) {
            for (Path p : stream) {
                // basePath 외부 경로 방지 (이론상 dir 이 이미 안전하지만 한 번 더 검증)
                if (!p.normalize().startsWith(basePath)) continue;
                Files.deleteIfExists(p);
            }
        } catch (IOException e) {
            log.warn("sibling 파일 삭제 실패 (무시): base={}, dir={}", base, dir, e);
        }
    }

    // subPath 첫 번째 세그먼트(domain)로 URL 프리픽스 결정
    // 예: "notices/202506" → /api/notices/images/, "popups/202506" → /api/popups/images/
    private String buildUrl(String subPath, String fileName) {
        int slashIdx = subPath.indexOf('/');
        String domain = slashIdx >= 0 ? subPath.substring(0, slashIdx) : subPath;
        return "/api/" + domain + "/images/" + fileName;
    }

    private String stripExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? fileName : fileName.substring(0, dot);
    }

    // [보안] Path Traversal 방어:
    //   저장 전 Paths.get(basePath).resolve(subPath).resolve(savedFileName).normalize() 로
    //   최종 경로가 basePath 내부인지 반드시 검증.
    //   basePath 밖으로 벗어나는 경우 INVALID_FILE_PATH 예외 발생.
    private Path resolveAndValidate(String subPath, String fileName) {
        Path resolved = (fileName != null)
                ? basePath.resolve(subPath).resolve(fileName).normalize()
                : basePath.resolve(subPath).normalize();

        if (!resolved.startsWith(basePath)) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        return resolved;
    }
}
