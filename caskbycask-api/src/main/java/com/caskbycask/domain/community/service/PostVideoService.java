package com.caskbycask.domain.community.service;

import com.caskbycask.domain.community.dto.PostVideoUploadResponse;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostVideo;
import com.caskbycask.domain.community.repository.PostVideoRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.util.PostVideoValidator;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostVideoService {

    private final PostVideoRepository videoRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final PostVideoValidator videoValidator;

    @Value("${storage.local.base-path}")
    private String basePathStr;

    @Transactional
    public PostVideoUploadResponse upload(MultipartFile file, Long uploaderId) {
        String mimeType      = videoValidator.validate(file);
        String savedFileName = videoValidator.generateSavedFileName(file.getOriginalFilename());
        String subPath       = "posts-videos/" + YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));

        fileStorageService.upload(file, savedFileName, subPath);

        User uploader = userRepository.getByIdOrThrow(uploaderId);

        PostVideo video = PostVideo.builder()
                .originalFileName(file.getOriginalFilename())
                .savedFileName(savedFileName)
                .fileSize(file.getSize())
                .mimeType(mimeType)
                .videoUrl("/api/posts/videos/" + savedFileName)
                .subPath(subPath)
                .uploadedBy(uploader)
                .build();

        return PostVideoUploadResponse.from(videoRepository.save(video));
    }

    // 본문에 사용된 동영상 URL 들의 파일 크기 합 (미디어 용량 정책 검증용)
    @Transactional(readOnly = true)
    public long totalFileSize(Set<String> videoUrls) {
        if (videoUrls.isEmpty()) return 0L;
        return videoRepository.findByVideoUrlIn(videoUrls).stream()
                .mapToLong(PostVideo::getFileSize)
                .sum();
    }

    public PostVideo loadForStream(String savedFileName) {
        return videoRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_VIDEO_NOT_FOUND));
    }

    // [보안] basePath 내부임을 재검증 후 실제 파일 경로 반환
    public Path resolveVideoPath(PostVideo video) {
        Path base     = Paths.get(basePathStr).toAbsolutePath().normalize();
        Path resolved = base.resolve(video.getSubPath()).resolve(video.getSavedFileName()).normalize();
        if (!resolved.startsWith(base)) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        return resolved;
    }

    // 게시글 저장/수정 후 content의 <video src> URL을 파싱해 PostVideo 연결
    @Transactional
    public void syncVideoUsage(Post post, String htmlContent) {
        Set<String> usedUrls = Jsoup.parse(htmlContent).select("video[src]").stream()
                .map(el -> el.attr("src"))
                .filter(src -> !src.isBlank())
                .collect(Collectors.toSet());

        videoRepository.findByPostId(post.getId()).forEach(v -> {
            if (!usedUrls.contains(v.getVideoUrl())) v.linkPost(null);
        });

        usedUrls.forEach(url ->
                videoRepository.findByVideoUrl(url).ifPresent(v -> v.linkPost(post))
        );
    }
}
