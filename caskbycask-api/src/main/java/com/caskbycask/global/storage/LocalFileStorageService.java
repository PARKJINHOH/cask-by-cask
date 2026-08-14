package com.caskbycask.global.storage;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
import java.util.Map;

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
        return uploadImage(
                file,
                originalSavedFileName,
                subPath,
                detectedMimeType,
                WebpConversionMode.LOSSY
        );
    }

    @Override
    public ImageUploadResult uploadImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType,
            WebpConversionMode conversionMode
    ) {
        return uploadImage(
                file, originalSavedFileName, subPath, detectedMimeType,
                conversionMode, false);
    }

    @Override
    public ImageUploadResult uploadImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType,
            WebpConversionMode conversionMode,
            boolean forceReencode
    ) {
        return storeImage(file, originalSavedFileName, subPath, detectedMimeType,
                conversionMode, forceReencode, null);
    }

    @Override
    public ImageUploadResult uploadResponsiveImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType,
            WebpConversionMode conversionMode,
            ResponsiveImageSpec spec
    ) {
        // 해상도 상한이 붙으므로 이미 WebP 로 올라온 파일도 다시 인코딩해야 한다.
        // 단 GIF 는 예외 — 재인코딩하면 애니메이션이 정지 이미지가 된다(기존 정책 유지).
        // 변환을 건너뛰면 축소본도 만들지 않으므로 srcset 은 원본 하나로 폴백된다.
        boolean reencode = !"image/gif".equals(detectedMimeType);
        return storeImage(file, originalSavedFileName, subPath, detectedMimeType,
                conversionMode, reencode, spec);
    }

    /**
     * 원본 보관 + WebP 변환본(선택적으로 축소본까지) 저장.
     *
     * @param spec null 이면 해상도를 건드리지 않고 변형본도 만들지 않는다(기존 동작).
     */
    private ImageUploadResult storeImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType,
            WebpConversionMode conversionMode,
            boolean forceReencode,
            ResponsiveImageSpec spec
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
        if (forceReencode || webpConversionService.isConvertibleMime(detectedMimeType)) {
            String webpFileName = stripExtension(originalSavedFileName) + ".webp";
            Path webpPath = resolveAndValidate(subPath, webpFileName);
            try {
                byte[] sourceBytes = Files.readAllBytes(originalPath);
                // spec 이 없으면 기존 호출 그대로 둔다 — 배너·공지 등 10개 도메인의 동작을 바꾸지 않는다.
                byte[] webpBytes = spec == null
                        ? webpConversionService.toWebp(sourceBytes, conversionMode)
                        : webpConversionService.toWebp(sourceBytes, conversionMode, spec.maxEdge());
                Files.write(webpPath, webpBytes);
                if (spec != null) {
                    writeVariants(sourceBytes, subPath, webpFileName, conversionMode, spec);
                }
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

    /**
     * 반응형 축소본 저장. 축소본은 <b>원본 바이트</b>에서 만든다 —
     * 이미 손실 압축된 WebP 를 다시 줄여 재인코딩하면 세대 손실이 겹친다.
     * <p>
     * 실패해도 예외를 던지지 않는다. 변형본이 없으면 서빙 쪽이 본 이미지로 폴백하므로
     * 화면이 깨지지 않는다 (PostController#serveImage 참고).
     */
    private void writeVariants(
            byte[] sourceBytes,
            String subPath,
            String webpFileName,
            WebpConversionMode conversionMode,
            ResponsiveImageSpec spec
    ) {
        if (spec.variantWidths().isEmpty()) return;
        try {
            Map<Integer, byte[]> variants = webpConversionService.toWebpVariants(
                    sourceBytes, conversionMode, spec.variantWidths());
            for (Map.Entry<Integer, byte[]> variant : variants.entrySet()) {
                Path variantPath = resolveAndValidate(
                        subPath, ResponsiveImageSpec.variantFileName(webpFileName, variant.getKey()));
                Files.write(variantPath, variant.getValue());
            }
        } catch (Exception e) {
            log.warn("반응형 변형본 생성 실패, 본 이미지만 서빙: {}", webpFileName, e);
        }
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

        // dual-save 로 생성된 sibling (원본 보관 파일 + 반응형 축소본) 제거.
        // savedFileName 이 uuid.webp 면 uuid.png(원본)와 uuid_w640.webp(변형본)를 함께 정리한다.
        // glob 이 "uuid.*" 면 언더스코어가 붙는 변형본이 남으므로 "uuid*" 로 잡는다 —
        // UUID 는 유일하므로 다른 이미지의 파일이 걸릴 일이 없다.
        String base = stripExtension(savedFileName);
        Path dir = targetFile.getParent();
        if (dir == null || !Files.isDirectory(dir)) return;
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir, base + "*")) {
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
