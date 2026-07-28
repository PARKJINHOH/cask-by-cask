package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialImageRenderServiceTest {

    @TempDir
    Path tempDir;

    private SocialImageRenderService service;

    @BeforeEach
    void setUp() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setSiteUrl("https://www.caskbycask.net");
        properties.setPublicMediaBaseUrl("https://www.caskbycask.net");
        service = new SocialImageRenderService(properties);
        ReflectionTestUtils.setField(service, "basePathValue", tempDir.toString());
    }

    @Test
    void normalizesThreeByFourUploadToInstagramPortraitJpeg() throws Exception {
        MockMultipartFile upload = new MockMultipartFile(
                "file", "review.jpg", "image/jpeg", jpeg(810, 1080));

        String imageUrl = service.storeDirectUpload(upload);
        BufferedImage rendered = readGenerated(imageUrl);

        assertThat(imageUrl).startsWith("/api/social/images/");
        assertThat(rendered.getWidth()).isEqualTo(1080);
        assertThat(rendered.getHeight()).isEqualTo(1350);
    }

    @Test
    void rendersStoredReviewUploadWithoutCallingItsPublicHttpEndpoint() throws Exception {
        String fileName = "123e4567-e89b-12d3-a456-426614174000.webp";
        Path source = tempDir.resolve("reviews/202607").resolve(fileName);
        Files.createDirectories(source.getParent());
        Files.write(source, jpeg(1600, 900));

        String imageUrl = service.renderReviewUpload("reviews/202607", fileName);
        BufferedImage rendered = readGenerated(imageUrl);
        Color topMargin = new Color(rendered.getRGB(100, 100));
        Color imageCenter = new Color(rendered.getRGB(
                rendered.getWidth() / 2, rendered.getHeight() / 2));

        assertThat(rendered.getWidth()).isEqualTo(1080);
        assertThat(rendered.getHeight()).isEqualTo(1350);
        assertThat(topMargin.getRed()).isGreaterThan(245);
        assertThat(topMargin.getGreen()).isGreaterThan(245);
        assertThat(topMargin.getBlue()).isGreaterThan(245);
        assertThat(imageCenter).isNotEqualTo(Color.WHITE);
    }

    @Test
    void rejectsReviewUploadPathTraversal() {
        assertThatThrownBy(() -> service.renderReviewUpload(
                "reviews/../../secret", "123e4567-e89b-12d3-a456-426614174000.webp"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rendersReviewWithoutBlurredBackgroundAndKeepsWholeImage() throws Exception {
        Path source = tempDir.resolve("spirits/review.jpg");
        Files.createDirectories(source.getParent());
        Files.write(source, jpeg(810, 1080));

        String imageUrl = service.renderReview(
                "/uploads/spirits/review.jpg", "글렌피딕 12년", "후기");
        BufferedImage rendered = readGenerated(imageUrl);
        Color corner = new Color(rendered.getRGB(0, 0));
        Color center = new Color(rendered.getRGB(rendered.getWidth() / 2, rendered.getHeight() / 2));
        Color captionBackground = new Color(rendered.getRGB(80, 1200));
        Color labelBackground = new Color(rendered.getRGB(75, 75));

        assertThat(rendered.getWidth()).isEqualTo(1080);
        assertThat(rendered.getHeight()).isEqualTo(1350);
        assertThat(corner.getRed()).isGreaterThan(245);
        assertThat(corner.getGreen()).isGreaterThan(245);
        assertThat(corner.getBlue()).isGreaterThan(245);
        assertThat(center).isNotEqualTo(Color.WHITE);
        assertThat(captionBackground.getRed()).isLessThan(40);
        assertThat(captionBackground.getGreen()).isLessThan(40);
        assertThat(captionBackground.getBlue()).isLessThan(40);
        assertThat(countBrightPixels(rendered, 150, 1100, 930, 1280)).isGreaterThan(100);
        assertThat(labelBackground.getRed()).isLessThan(50);
        assertThat(labelBackground.getGreen()).isLessThan(50);
        assertThat(labelBackground.getBlue()).isLessThan(50);
        assertThat(countBrightPixels(rendered, 70, 55, 250, 125)).isGreaterThan(50);
    }

    @Test
    void compositesTransparentReviewImageOntoWhiteBackground() throws Exception {
        Path source = tempDir.resolve("spirits/transparent.png");
        Files.createDirectories(source.getParent());
        Files.write(source, transparentPng(810, 1080));

        String imageUrl = service.renderReview(
                "/uploads/spirits/transparent.png", "Transparent Bottle", "Review");
        BufferedImage rendered = readGenerated(imageUrl);
        Color transparentCorner = new Color(rendered.getRGB(200, 200));
        Color bottleCenter = new Color(rendered.getRGB(rendered.getWidth() / 2, rendered.getHeight() / 2));

        assertThat(transparentCorner.getRed()).isGreaterThan(245);
        assertThat(transparentCorner.getGreen()).isGreaterThan(245);
        assertThat(transparentCorner.getBlue()).isGreaterThan(245);
        assertThat(bottleCenter.getRed()).isLessThan(180);
    }

    @Test
    void rendersBoldBlackUnderlinedIdentifierAtTheLeftEdgeOfTheTitleBackground() {
        BufferedImage source = new BufferedImage(810, 1080, BufferedImage.TYPE_INT_RGB);
        Graphics2D sourceGraphics = source.createGraphics();
        sourceGraphics.setColor(new Color(127, 73, 42));
        sourceGraphics.fillRect(0, 0, source.getWidth(), source.getHeight());
        sourceGraphics.dispose();

        BufferedImage withoutIdentifier = service.composeReviewImage(
                source, "러셀 리저브 13년", null, "후기");
        BufferedImage withIdentifier = service.composeReviewImage(
                source, "러셀 리저브 13년", "2025 여름 에디션", "후기");

        long changedPixels = countChangedPixels(
                withoutIdentifier, withIdentifier, 64, 1000, 1016, 1200);
        long blackPixelsAtLeftEdge = countDarkPixels(
                withIdentifier, 60, 1080, 220, 1170);
        long whiteOutlinePixels = countBrightPixels(
                withIdentifier, 60, 1080, 400, 1170);

        assertThat(changedPixels).isGreaterThan(500);
        assertThat(changedPixels).isLessThan(15_000);
        assertThat(blackPixelsAtLeftEdge).isGreaterThan(100);
        assertThat(whiteOutlinePixels).isGreaterThan(50);
    }

    @Test
    void rendersEditionImageNoticeAtTheRightEdgeAboveTheTitleBackground() {
        BufferedImage source = new BufferedImage(810, 1080, BufferedImage.TYPE_INT_RGB);
        Graphics2D sourceGraphics = source.createGraphics();
        sourceGraphics.setColor(new Color(127, 73, 42));
        sourceGraphics.fillRect(0, 0, source.getWidth(), source.getHeight());
        sourceGraphics.dispose();

        BufferedImage withoutNotice = service.composeReviewImage(
                source, "러셀 리저브 13년", "2025 여름 에디션", null, "후기");
        BufferedImage withNotice = service.composeReviewImage(
                source,
                "러셀 리저브 13년",
                "2025 여름 에디션",
                "※ 대표 이미지는 리뷰한 에디션과 다를 수 있습니다.",
                "후기");

        long changedPixelsAtRight = countChangedPixels(
                withoutNotice, withNotice, 550, 1080, 1016, 1180);
        long changedPixelsAtLeft = countChangedPixels(
                withoutNotice, withNotice, 64, 1080, 400, 1180);

        assertThat(changedPixelsAtRight).isGreaterThan(200);
        assertThat(changedPixelsAtLeft).isLessThan(changedPixelsAtRight);
    }

    @Test
    void rendersTemplateAsPortraitJpeg() throws Exception {
        MockMultipartFile background = new MockMultipartFile(
                "file", "background.png", "image/png", png(1200, 800));
        String backgroundUrl = service.storeTemplateBackground(background);

        String imageUrl = service.renderTemplate(backgroundUrl, "New whisky release", "출시");
        BufferedImage rendered = readGenerated(imageUrl);

        assertThat(rendered.getWidth()).isEqualTo(1080);
        assertThat(rendered.getHeight()).isEqualTo(1350);
        assertThat(new Color(rendered.getRGB(75, 75)).getRed()).isLessThan(80);
        Color outerFrame = new Color(rendered.getRGB(28, 100));
        assertThat(outerFrame.getRed()).isGreaterThan(150);
        assertThat(outerFrame.getGreen()).isGreaterThan(100);
    }

    @Test
    void wrapsTemplateTitleAtWordBoundariesWhenWordsFit() {
        BufferedImage image = new BufferedImage(1080, 1350, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 48));
        String title = "메타 베브 코리아 신제품 위스키 국내 공식 출시 소식";

        var lines = SocialImageRenderService.wrapWords(
                title, graphics.getFontMetrics(), 260, 6);
        graphics.dispose();

        assertThat(String.join(" ", lines)).isEqualTo(title);
        assertThat(lines).allMatch(line ->
                java.util.Arrays.stream(line.split(" "))
                        .allMatch(word -> title.contains(word)));
    }

    @Test
    void preservesUserLineBreaksWhenWrappingTemplateTitle() {
        BufferedImage image = new BufferedImage(1080, 1350, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 48));
        String title = "캐바캐가 전하는\n신제품 위스키\n국내 출시 소식";

        var lines = SocialImageRenderService.wrapTemplateTitle(
                title, graphics.getFontMetrics(), 760, 5);
        graphics.dispose();

        assertThat(lines).containsExactly(
                "캐바캐가 전하는",
                "신제품 위스키",
                "국내 출시 소식");
    }

    @Test
    void keepsBlankUserLineWhenWrappingTemplateTitle() {
        BufferedImage image = new BufferedImage(1080, 1350, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 48));

        var lines = SocialImageRenderService.wrapTemplateTitle(
                "첫 번째 줄\n\n두 번째 줄", graphics.getFontMetrics(), 760, 5);
        graphics.dispose();

        assertThat(lines).containsExactly("첫 번째 줄", "", "두 번째 줄");
    }

    @Test
    void wrapsLongReviewNameWithoutEllipsisOrDroppedText() {
        BufferedImage image = new BufferedImage(1080, 1350, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 40));
        String name = "The Macallan Exceptional Single Malt Whisky Anniversary Collection Full Name";

        var lines = SocialImageRenderService.wrapFully(
                name, graphics.getFontMetrics(), 360);
        graphics.dispose();

        assertThat(lines).noneMatch(line -> line.contains("…") || line.endsWith("..."));
        assertThat(String.join("", lines).replaceAll("\\s+", ""))
                .isEqualTo(name.replaceAll("\\s+", ""));
    }

    @Test
    void rejectsGeneratedImagePathTraversal() {
        assertThatThrownBy(() -> service.resolveGeneratedImage("202607", "../secret.jpg"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private BufferedImage readGenerated(String url) throws Exception {
        String[] parts = url.split("/");
        Path path = service.resolveGeneratedImage(parts[4], parts[5]);
        return ImageIO.read(path.toFile());
    }

    private static byte[] jpeg(int width, int height) throws Exception {
        return image(width, height, "jpg");
    }

    private static byte[] png(int width, int height) throws Exception {
        return image(width, height, "png");
    }

    private static byte[] image(int width, int height, String format) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setPaint(new Color(127, 73, 42));
        graphics.fillRect(0, 0, width, height);
        graphics.setPaint(new Color(236, 199, 112));
        graphics.fillOval(width / 4, height / 5, width / 2, height * 3 / 5);
        graphics.dispose();
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, format, output);
            return output.toByteArray();
        }
    }

    private static byte[] transparentPng(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(new Color(90, 45, 20, 255));
        graphics.fillRoundRect(width / 3, height / 8, width / 3, height * 3 / 4, 60, 60);
        graphics.dispose();
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        }
    }

    private static long countBrightPixels(BufferedImage image, int minX, int minY, int maxX, int maxY) {
        long count = 0;
        for (int y = minY; y < maxY; y++) {
            for (int x = minX; x < maxX; x++) {
                Color color = new Color(image.getRGB(x, y));
                if (color.getRed() > 220 && color.getGreen() > 220 && color.getBlue() > 220) {
                    count++;
                }
            }
        }
        return count;
    }

    private static long countChangedPixels(BufferedImage first, BufferedImage second,
                                           int minX, int minY, int maxX, int maxY) {
        long count = 0;
        for (int y = minY; y < maxY; y++) {
            for (int x = minX; x < maxX; x++) {
                if (first.getRGB(x, y) != second.getRGB(x, y)) count++;
            }
        }
        return count;
    }

    private static long countDarkPixels(BufferedImage image,
                                        int minX, int minY, int maxX, int maxY) {
        long count = 0;
        for (int y = minY; y < maxY; y++) {
            for (int x = minX; x < maxX; x++) {
                Color color = new Color(image.getRGB(x, y));
                if (color.getRed() < 60 && color.getGreen() < 60 && color.getBlue() < 60) {
                    count++;
                }
            }
        }
        return count;
    }

}
