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
                .subPath(subPath)
                .uploadedBy(uploader)
                .build();

        return PostImageUploadResponse.from(postImageRepository.save(image));
    }

    // 본문에 사용된 이미지 URL 들의 파일 크기 합 (미디어 용량 정책 검증용)
    @Transactional(readOnly = true)
    public long totalFileSize(Set<String> imageUrls) {
        if (imageUrls.isEmpty()) return 0L;
        return postImageRepository.findByImageUrlIn(imageUrls).stream()
                .mapToLong(PostImage::getFileSize)
                .sum();
    }

    // local 프로파일 전용 서빙
    public PostImage findBySavedFileName(String savedFileName) {
        return postImageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_IMAGE_NOT_FOUND));
    }

    public Resource loadAsResource(String savedFileName, String subPath) {
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
}
