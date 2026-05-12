package com.drinkindex.global.storage;

import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;

@Slf4j
@Service
@Profile({"local", "test"})
public class LocalFileStorageService implements FileStorageService {

    private final Path basePath;

    public LocalFileStorageService(@Value("${storage.local.base-path}") String basePathStr) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
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

        return "/api/notices/images/" + savedFileName;
    }

    @Override
    public void delete(String savedFileName, String subPath) {
        Path targetFile = resolveAndValidate(subPath, savedFileName);
        try {
            Files.deleteIfExists(targetFile);
        } catch (IOException e) {
            // 파일이 없거나 삭제 실패 시 경고만 기록하고 계속 진행
            log.warn("파일 삭제 실패 (무시): {}", targetFile, e);
        }
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
