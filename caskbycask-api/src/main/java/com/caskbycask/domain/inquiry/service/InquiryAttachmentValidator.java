package com.caskbycask.domain.inquiry.service;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class InquiryAttachmentValidator {

    public static final int MAX_FILE_COUNT = 3;
    public static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;
    public static final long MAX_TOTAL_SIZE = 15 * 1024 * 1024L;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "gif",
            "pdf", "txt", "csv", "docx", "xlsx", "pptx", "hwp", "hwpx"
    );

    private static final Map<String, String> CONTENT_TYPES = Map.ofEntries(
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("png", "image/png"),
            Map.entry("webp", "image/webp"),
            Map.entry("gif", "image/gif"),
            Map.entry("pdf", "application/pdf"),
            Map.entry("txt", "text/plain"),
            Map.entry("csv", "text/csv"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("hwp", "application/x-hwp"),
            Map.entry("hwpx", "application/vnd.hancom.hwpx")
    );

    public List<ValidatedAttachment> validate(List<MultipartFile> files) {
        if (files.size() > MAX_FILE_COUNT) {
            throw new CustomException(ErrorCode.INQUIRY_TOO_MANY_ATTACHMENTS);
        }

        long totalSize = 0L;
        for (MultipartFile file : files) {
            if (file.getSize() > MAX_FILE_SIZE) {
                throw new CustomException(ErrorCode.INQUIRY_ATTACHMENT_SIZE_EXCEEDED);
            }
            totalSize += file.getSize();
        }
        if (totalSize > MAX_TOTAL_SIZE) {
            throw new CustomException(ErrorCode.INQUIRY_TOTAL_ATTACHMENT_SIZE_EXCEEDED);
        }

        return files.stream().map(this::validateFile).toList();
    }

    private ValidatedAttachment validateFile(MultipartFile file) {
        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        String extension = extensionOf(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension) || !matchesContent(file, extension)) {
            throw new CustomException(ErrorCode.INQUIRY_INVALID_ATTACHMENT_FORMAT);
        }
        return new ValidatedAttachment(originalFilename, extension, CONTENT_TYPES.get(extension));
    }

    private boolean matchesContent(MultipartFile file, String extension) {
        try {
            return switch (extension) {
                case "jpg", "jpeg" -> startsWith(file, 0xFF, 0xD8, 0xFF);
                case "png" -> startsWith(file, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
                case "gif" -> startsWith(file, 0x47, 0x49, 0x46, 0x38);
                case "webp" -> isWebp(file);
                case "pdf" -> startsWith(file, 0x25, 0x50, 0x44, 0x46, 0x2D);
                case "txt", "csv" -> isText(file);
                case "hwp" -> startsWith(file, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);
                case "docx" -> isZipPackage(file, "word/");
                case "xlsx" -> isZipPackage(file, "xl/");
                case "pptx" -> isZipPackage(file, "ppt/");
                case "hwpx" -> isHwpx(file);
                default -> false;
            };
        } catch (IOException e) {
            return false;
        }
    }

    private boolean startsWith(MultipartFile file, int... expected) throws IOException {
        try (InputStream input = file.getInputStream()) {
            byte[] header = input.readNBytes(expected.length);
            if (header.length != expected.length) return false;
            for (int i = 0; i < expected.length; i++) {
                if ((header[i] & 0xFF) != expected[i]) return false;
            }
            return true;
        }
    }

    private boolean isWebp(MultipartFile file) throws IOException {
        try (InputStream input = file.getInputStream()) {
            byte[] header = input.readNBytes(12);
            return header.length == 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
        }
    }

    private boolean isText(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        if (bytes.length == 0) return false;
        for (byte value : bytes) {
            if (value == 0) return false;
        }
        return true;
    }

    private boolean isZipPackage(MultipartFile file, String requiredPrefix) throws IOException {
        boolean hasContentTypes = false;
        boolean hasRequiredDirectory = false;
        try (ZipInputStream zip = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            int entryCount = 0;
            while ((entry = zip.getNextEntry()) != null && entryCount++ < 2_000) {
                String name = entry.getName();
                if ("[Content_Types].xml".equals(name)) hasContentTypes = true;
                if (name.startsWith(requiredPrefix)) hasRequiredDirectory = true;
                if (hasContentTypes && hasRequiredDirectory) return true;
            }
        }
        return false;
    }

    private boolean isHwpx(MultipartFile file) throws IOException {
        boolean hasContents = false;
        boolean hasVersion = false;
        try (ZipInputStream zip = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            int entryCount = 0;
            while ((entry = zip.getNextEntry()) != null && entryCount++ < 2_000) {
                String name = entry.getName();
                if (name.startsWith("Contents/")) hasContents = true;
                if ("version.xml".equalsIgnoreCase(name)) hasVersion = true;
                if (hasContents && hasVersion) return true;
            }
        }
        return false;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "";
        String normalized = filename.replace('\\', '/');
        normalized = normalized.substring(normalized.lastIndexOf('/') + 1)
                .replace("\r", "")
                .replace("\n", "")
                .trim();
        if (normalized.length() > 255) normalized = normalized.substring(normalized.length() - 255);
        return normalized;
    }

    private static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 1 || dot == filename.length() - 1) return "";
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public static String contentTypeFor(String filename) {
        return CONTENT_TYPES.getOrDefault(extensionOf(filename), "application/octet-stream");
    }

    public record ValidatedAttachment(String originalFilename, String extension, String contentType) {}
}
