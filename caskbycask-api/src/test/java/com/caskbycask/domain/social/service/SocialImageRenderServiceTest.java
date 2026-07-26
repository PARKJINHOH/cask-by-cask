package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.Color;
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
    void rendersReviewWithoutBlurredBackgroundAndKeepsWholeImage() throws Exception {
        Path source = tempDir.resolve("spirits/review.jpg");
        Files.createDirectories(source.getParent());
        Files.write(source, jpeg(810, 1080));

        String imageUrl = service.renderReview("/uploads/spirits/review.jpg");
        BufferedImage rendered = readGenerated(imageUrl);
        Color corner = new Color(rendered.getRGB(0, 0));
        Color center = new Color(rendered.getRGB(rendered.getWidth() / 2, rendered.getHeight() / 2));

        assertThat(rendered.getWidth()).isEqualTo(1080);
        assertThat(rendered.getHeight()).isEqualTo(1350);
        assertThat(corner.getRed()).isGreaterThan(245);
        assertThat(corner.getGreen()).isGreaterThan(245);
        assertThat(corner.getBlue()).isGreaterThan(245);
        assertThat(center).isNotEqualTo(Color.WHITE);
    }

    @Test
    void compositesTransparentReviewImageOntoWhiteBackground() throws Exception {
        Path source = tempDir.resolve("spirits/transparent.png");
        Files.createDirectories(source.getParent());
        Files.write(source, transparentPng(810, 1080));

        String imageUrl = service.renderReview("/uploads/spirits/transparent.png");
        BufferedImage rendered = readGenerated(imageUrl);
        Color transparentCorner = new Color(rendered.getRGB(200, 200));
        Color bottleCenter = new Color(rendered.getRGB(rendered.getWidth() / 2, rendered.getHeight() / 2));

        assertThat(transparentCorner.getRed()).isGreaterThan(245);
        assertThat(transparentCorner.getGreen()).isGreaterThan(245);
        assertThat(transparentCorner.getBlue()).isGreaterThan(245);
        assertThat(bottleCenter.getRed()).isLessThan(180);
    }

    @Test
    void rendersTemplateAsPortraitJpeg() throws Exception {
        MockMultipartFile background = new MockMultipartFile(
                "file", "background.png", "image/png", png(1200, 800));
        String backgroundUrl = service.storeTemplateBackground(background);

        String imageUrl = service.renderTemplate(backgroundUrl, "New whisky release");
        BufferedImage rendered = readGenerated(imageUrl);

        assertThat(rendered.getWidth()).isEqualTo(1080);
        assertThat(rendered.getHeight()).isEqualTo(1350);
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
}
