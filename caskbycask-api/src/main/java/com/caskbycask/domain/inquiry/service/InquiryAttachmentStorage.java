package com.caskbycask.domain.inquiry.service;

import com.caskbycask.domain.inquiry.entity.InquiryAttachmentMetadata;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;

@Component
public class InquiryAttachmentStorage {

    private final Path storageRoot;

    public InquiryAttachmentStorage(@Value("${storage.local.base-path}") String basePath) {
        this.storageRoot = Paths.get(basePath).toAbsolutePath().normalize();
    }

    public InquiryAttachmentDownload load(InquiryAttachmentMetadata attachment) {
        String storedFilename = attachment.storedFilename();
        if (storedFilename == null || storedFilename.contains("..")
                || storedFilename.contains("/") || storedFilename.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Path file = attachment.subPath() == null
                ? findLegacyFile(storedFilename)
                : resolveNewFile(attachment.subPath(), storedFilename);

        try {
            if (!Files.isRegularFile(file) || !Files.isReadable(file)) {
                throw new CustomException(ErrorCode.INQUIRY_ATTACHMENT_NOT_FOUND);
            }
            return new InquiryAttachmentDownload(
                    new FileSystemResource(file),
                    attachment.originalFilename(),
                    attachment.contentType(),
                    Files.size(file)
            );
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INQUIRY_ATTACHMENT_NOT_FOUND);
        }
    }

    private Path resolveNewFile(String subPath, String storedFilename) {
        Path file = storageRoot.resolve(subPath).resolve(storedFilename).normalize();
        if (!file.startsWith(storageRoot)) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        return file;
    }

    private Path findLegacyFile(String storedFilename) {
        Path inquiryRoot = storageRoot.resolve("inquiries").normalize();
        if (!inquiryRoot.startsWith(storageRoot) || !Files.isDirectory(inquiryRoot)) {
            throw new CustomException(ErrorCode.INQUIRY_ATTACHMENT_NOT_FOUND);
        }
        try (Stream<Path> files = Files.walk(inquiryRoot, 2)) {
            return files
                    .filter(path -> path.normalize().startsWith(inquiryRoot))
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equals(storedFilename))
                    .findFirst()
                    .orElseThrow(() -> new CustomException(ErrorCode.INQUIRY_ATTACHMENT_NOT_FOUND));
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INQUIRY_ATTACHMENT_NOT_FOUND);
        }
    }
}
