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
import com.caskbycask.global.storage.ResponsiveImageSpec;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.caskbycask.global.util.HtmlImageUrlExtractor;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PostImageService {

    /**
     * 저장할 본 이미지의 장변 상한(px).
     * <p>
     * 모바일 최고 화소밀도(DPR 3, 논리폭 ~430pt ≈ 1290px)와 라이트박스 확대까지 감안해도
     * 육안 손실이 없는 선이다. 폰 사진 원본(6000×4000 등)을 그대로 두면 목록 한 페이지에
     * 수십 MB 가 나가고 디스크도 그만큼 쓴다.
     */
    private static final int MAX_STORED_EDGE = 2560;

    /**
     * 목록·상세용 반응형 축소본 폭.
     * <p>
     * ⚠️ 프론트의 {@code photo-gallery/utils/photoImageVariants.ts} 가 같은 폭으로 srcset 을 만든다.
     * 한쪽만 바꾸면 없는 파일을 가리키게 되므로 반드시 함께 수정한다.
     */
    private static final List<Integer> VARIANT_WIDTHS = List.of(640, 1280);

    /** 디코딩 폭탄 방어 — ReviewImageService 와 같은 기준. */
    private static final long MAX_PIXELS = 40_000_000L;

    private final PostImageRepository postImageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ValidatedImageUploader validatedImageUploader;
    private final ImageDimensionReader imageDimensionReader;

    @Transactional
    public PostImageUploadResponse upload(MultipartFile file, Long uploaderId) {
        // 이미지 갤러리 목록(justified 그리드)이 비율을 미리 알아야 한다.
        // StoredImage 레코드는 배너·공지·팝업 등 6개 서비스가 공유하므로 건드리지 않고
        // 여기서만 따로 읽는다. 못 읽으면 null 로 두고 프론트가 보정한다.
        //
        // 저장 전에 읽는다 — 픽셀 상한 검사를 디스크에 쓰기 전에 끝내야 한다.
        // (헤더만 읽으므로 4천만 픽셀 이미지를 BufferedImage 로 펼치지 않는다)
        Dimension dimension = imageDimensionReader.read(file).orElse(null);
        if (dimension != null
                && (long) dimension.width() * dimension.height() > MAX_PIXELS) {
            throw new CustomException(ErrorCode.POST_IMAGE_DIMENSIONS_EXCEEDED);
        }

        // [보안] 공통 검증(크기 → 내용 기반 포맷 판별 → UUID 파일명) + 연월별 디렉토리 저장
        // 갤러리는 원본이 크고 목록에서는 작게 쓰이므로 해상도 상한 + 축소본까지 함께 만든다.
        StoredImage stored = validatedImageUploader.uploadResponsive(
                file, "posts", new ResponsiveImageSpec(MAX_STORED_EDGE, VARIANT_WIDTHS));

        User uploader = userRepository.getByIdOrThrow(uploaderId);

        // 저장된 본 이미지 기준 크기 — 상한을 넘긴 원본은 줄여서 저장되므로 그 값을 남긴다.
        // (그리드가 쓰는 것은 비율이라 축소해도 배치는 동일하다)
        Dimension storedDimension = shrinkToStoredEdge(dimension);

        PostImage image = PostImage.builder()
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .subPath(stored.subPath())
                .width(storedDimension != null ? storedDimension.width() : null)
                .height(storedDimension != null ? storedDimension.height() : null)
                .uploadedBy(uploader)
                .build();

        return PostImageUploadResponse.from(postImageRepository.save(image));
    }

    /** 업로드 시 적용되는 장변 상한을 크기 값에도 똑같이 반영한다 (WebpConversionService 와 같은 계산). */
    private Dimension shrinkToStoredEdge(Dimension dimension) {
        if (dimension == null) return null;
        int longestEdge = Math.max(dimension.width(), dimension.height());
        if (longestEdge <= MAX_STORED_EDGE) return dimension;

        double ratio = (double) MAX_STORED_EDGE / longestEdge;
        return new Dimension(
                Math.max(1, (int) Math.round(dimension.width() * ratio)),
                Math.max(1, (int) Math.round(dimension.height() * ratio))
        );
    }

    // 본문에 사용된 이미지 URL 들의 파일 크기 합 (미디어 용량 정책 검증용)
    @Transactional(readOnly = true)
    public long totalFileSize(Set<String> imageUrls) {
        if (imageUrls.isEmpty()) return 0L;
        return postImageRepository.findByImageUrlIn(imageUrls).stream()
                .mapToLong(PostImage::getFileSize)
                .sum();
    }

    public PostImage findBySavedFileName(String savedFileName) {
        return postImageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_IMAGE_NOT_FOUND));
    }

    public Resource loadAsResource(String savedFileName, String subPath) {
        return fileStorageService.loadAsResource(savedFileName, subPath);
    }

    /** 서빙할 파일 하나 — 실제 바이트와 그 바이트의 MIME 타입. */
    public record ServableImage(Resource resource, String mimeType) {}

    /** {@code {uuid}_w640.webp} 형태의 반응형 변형본 요청. */
    private static final Pattern VARIANT_FILE_NAME = Pattern.compile("^(.+)_w(\\d{1,5})\\.webp$");

    /**
     * 요청된 파일명으로 서빙할 이미지를 찾는다.
     * <p>
     * 폭 접미사가 붙어 있으면 그 축소본을 돌려주고, <b>축소본이 없으면 본 이미지로 폴백</b>한다.
     * 반응형 변형본은 이 기능 도입 이후 업로드분에만 있으므로, 폴백이 없으면 기존 게시글의
     * srcset 이 전부 404 가 되어 이미지가 깨진다. 폴백 덕분에 백필 없이도 안전하다.
     */
    public ServableImage loadForServing(String requestedFileName) {
        Matcher matcher = VARIANT_FILE_NAME.matcher(requestedFileName);
        String baseFileName = requestedFileName;
        boolean variantRequested = false;

        if (matcher.matches()) {
            // [보안] 우리가 실제로 만드는 폭만 받는다 — 임의 파일명으로 디렉토리를 훑지 못하게 한다.
            if (!VARIANT_WIDTHS.contains(Integer.parseInt(matcher.group(2)))) {
                throw new CustomException(ErrorCode.POST_IMAGE_NOT_FOUND);
            }
            baseFileName = matcher.group(1) + ".webp";
            variantRequested = true;
        }

        PostImage image = findBySavedFileName(baseFileName);

        if (variantRequested) {
            try {
                return new ServableImage(
                        fileStorageService.loadAsResource(requestedFileName, image.getSubPath()),
                        "image/webp");
            } catch (CustomException notFound) {
                // 변형본이 없는 기존 업로드 — 아래에서 본 이미지로 폴백한다.
            }
        }

        return new ServableImage(
                fileStorageService.loadAsResource(image.getSavedFileName(), image.getSubPath()),
                image.getMimeType());
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
