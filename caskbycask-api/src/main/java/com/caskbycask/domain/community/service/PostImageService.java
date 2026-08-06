package com.caskbycask.domain.community.service;

import com.caskbycask.domain.community.dto.PostImageUploadResponse;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostImage;
import com.caskbycask.domain.community.repository.PostImageRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ImageDimensionReader;
import com.caskbycask.global.storage.ImageDimensionReader.Dimension;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.caskbycask.global.util.HtmlImageUrlExtractor;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class PostImageService {

    private final PostImageRepository postImageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ValidatedImageUploader validatedImageUploader;
    private final ImageDimensionReader imageDimensionReader;

    @Transactional
    public PostImageUploadResponse upload(MultipartFile file, Long uploaderId) {
        // [보안] 4단계 검증 + 연월별 디렉토리 저장 (공통 흐름)
        StoredImage stored = validatedImageUploader.upload(file, "posts");

        // 이미지 갤러리 목록(justified 그리드)이 비율을 미리 알아야 한다.
        // StoredImage 레코드는 배너·공지·팝업 등 6개 서비스가 공유하므로 건드리지 않고
        // 여기서만 따로 읽는다. 못 읽으면 null 로 두고 프론트가 보정한다.
        Dimension dimension = imageDimensionReader.read(file).orElse(null);

        User uploader = userRepository.getByIdOrThrow(uploaderId);

        PostImage image = PostImage.builder()
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .subPath(stored.subPath())
                .width(dimension != null ? dimension.width() : null)
                .height(dimension != null ? dimension.height() : null)
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
        Set<String> usedUrls = HtmlImageUrlExtractor.extract(htmlContent);

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
