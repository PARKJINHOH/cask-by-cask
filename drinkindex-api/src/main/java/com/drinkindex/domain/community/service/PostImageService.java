package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.PostImageUploadResponse;
import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.PostImage;
import com.drinkindex.domain.community.repository.PostImageRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
import com.drinkindex.global.storage.ImageUploadResult;
import com.drinkindex.global.util.NoticeImageValidator;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostImageService {

    private final PostImageRepository postImageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NoticeImageValidator noticeImageValidator;

    @Transactional
    public PostImageUploadResponse upload(MultipartFile file, Long uploaderId) {
        String mimeType = noticeImageValidator.validate(file);
        String originalSavedFileName = noticeImageValidator.generateSavedFileName(file.getOriginalFilename());
        String subPath = "posts/" + YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        ImageUploadResult result = fileStorageService.uploadImage(file, originalSavedFileName, subPath, mimeType);

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        PostImage image = PostImage.builder()
                .originalFileName(file.getOriginalFilename())
                .savedFileName(result.savedFileName())
                .fileSize(file.getSize())
                .mimeType(result.mimeType())
                .imageUrl(result.imageUrl())
                .uploadedBy(uploader)
                .build();

        return PostImageUploadResponse.from(postImageRepository.save(image));
    }

    // local 프로파일 전용 서빙
    public Resource loadAsResource(String savedFileName) {
        PostImage image = postImageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_IMAGE_NOT_FOUND));
        String subPath = extractSubPath(image.getImageUrl(), savedFileName);
        return fileStorageService.loadAsResource(savedFileName, subPath);
    }

    // 게시글 저장/수정 후 content의 img[src] URL을 파싱하여 PostImage 연결
    @Transactional
    public void syncImageUsage(Post post, String htmlContent) {
        Set<String> usedUrls = Jsoup.parse(htmlContent).select("img[src]").stream()
                .map(el -> el.attr("src"))
                .filter(src -> !src.isBlank())
                .collect(Collectors.toSet());

        // 기존 연결 해제
        postImageRepository.findByPostId(post.getId()).forEach(img -> {
            if (!usedUrls.contains(img.getImageUrl())) {
                img.linkPost(null); // 사용 해제
            }
        });

        // 새로 연결
        usedUrls.forEach(url ->
                postImageRepository.findByImageUrl(url).ifPresent(img -> img.linkPost(post))
        );
    }

    private String extractSubPath(String imageUrl, String savedFileName) {
        if (imageUrl != null && imageUrl.contains("/api/")) {
            String[] parts = imageUrl.split("/api/")[1].split("/");
            return parts[0];
        }
        return "posts";
    }
}
