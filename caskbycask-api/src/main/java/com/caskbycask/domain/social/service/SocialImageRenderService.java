package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.sksamuel.scrimage.ImmutableImage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.font.FontRenderContext;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.InetAddress;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SocialImageRenderService {

    public static final int WIDTH = 1080;
    public static final int HEIGHT = 1350;
    private static final int REVIEW_CAPTION_HORIZONTAL_MARGIN = 72;
    private static final int REVIEW_CAPTION_BOTTOM_MARGIN = 60;
    private static final int REVIEW_CAPTION_HORIZONTAL_PADDING = 56;
    private static final int REVIEW_CAPTION_VERTICAL_PADDING = 32;
    private static final int REVIEW_CAPTION_FONT_SIZE = 56;
    private static final int REVIEW_CAPTION_MAX_LINES = 2;
    private static final long MAX_SOURCE_BYTES = 15L * 1024 * 1024;
    private static final long MAX_OUTPUT_BYTES = 8L * 1024 * 1024;
    private static final long MAX_SOURCE_PIXELS = 40_000_000L;

    @Value("${storage.local.base-path}")
    private String basePathValue;

    private final SocialPublishingProperties properties;

    public String renderReview(String sourceUrl, String spiritName) {
        BufferedImage source = readTrustedImage(sourceUrl);
        return writeJpeg(composeReviewImage(source, spiritName), "review");
    }

    public String renderDirect(String sourceUrl) {
        BufferedImage source = readTrustedImage(sourceUrl);
        return writeJpeg(composeCovered(source), "direct");
    }

    public String renderTemplate(String backgroundUrl, String text) {
        BufferedImage background = readTrustedImage(backgroundUrl);
        BufferedImage canvas = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = canvas.createGraphics();
        configure(graphics);
        drawCover(graphics, background, WIDTH, HEIGHT);
        graphics.setColor(new Color(0, 0, 0, 95));
        graphics.fillRect(0, 0, WIDTH, HEIGHT);
        graphics.setColor(new Color(0, 0, 0, 100));
        graphics.fillRoundRect(100, 355, 880, 640, 48, 48);

        String printableText = text == null ? "" : text.trim();
        Font font = preferredFont(64, Font.BOLD);
        if (!printableText.isEmpty() && font.canDisplayUpTo(printableText) >= 0) {
            graphics.dispose();
            throw new IllegalStateException(
                    "The server font cannot display the SNS thumbnail text. Install Noto Sans CJK KR.");
        }
        graphics.setFont(font);
        graphics.setColor(Color.WHITE);
        FontMetrics metrics = graphics.getFontMetrics();
        List<String> lines = wrap(printableText, metrics, 760, 6);
        int lineHeight = metrics.getHeight() + 14;
        int totalHeight = lines.size() * lineHeight;
        int y = (HEIGHT - totalHeight) / 2 + metrics.getAscent();
        for (String line : lines) {
            int x = (WIDTH - metrics.stringWidth(line)) / 2;
            graphics.drawString(line, x, y);
            y += lineHeight;
        }
        graphics.dispose();
        return writeJpeg(canvas, "template");
    }

    public String storeTemplateBackground(MultipartFile file) {
        BufferedImage source = decodeUpload(file);
        BufferedImage canvas = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = canvas.createGraphics();
        configure(graphics);
        drawCover(graphics, source, WIDTH, HEIGHT);
        graphics.dispose();
        return writeJpeg(canvas, "background");
    }

    public String storeDirectUpload(MultipartFile file) {
        return writeJpeg(composeCovered(decodeUpload(file)), "upload");
    }

    public Path resolveGeneratedImage(String yearMonth, String fileName) {
        if (!yearMonth.matches("\\d{6}") || !fileName.matches("[A-Za-z0-9._-]+")) {
            throw new IllegalArgumentException("Invalid social image path.");
        }
        Path base = basePath();
        Path resolved = base.resolve("social").resolve(yearMonth).resolve(fileName).normalize();
        if (!resolved.startsWith(base)) throw new IllegalArgumentException("Invalid social image path.");
        return resolved;
    }

    private BufferedImage composeReviewImage(BufferedImage source, String spiritName) {
        BufferedImage canvas = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = canvas.createGraphics();
        configure(graphics);
        graphics.setColor(Color.WHITE);
        graphics.fillRect(0, 0, WIDTH, HEIGHT);

        double scale = Math.min((double) WIDTH / source.getWidth(), (double) HEIGHT / source.getHeight());
        int drawWidth = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int drawHeight = Math.max(1, (int) Math.round(source.getHeight() * scale));
        int x = (WIDTH - drawWidth) / 2;
        int y = (HEIGHT - drawHeight) / 2;
        graphics.drawImage(source, x, y, drawWidth, drawHeight, null);
        drawReviewCaption(graphics, spiritName);
        graphics.dispose();
        return canvas;
    }

    private void drawReviewCaption(Graphics2D graphics, String spiritName) {
        String printableName = spiritName == null ? "" : spiritName.replaceAll("\\s+", " ").trim();
        if (printableName.isEmpty()) return;

        Font font = preferredFont(REVIEW_CAPTION_FONT_SIZE, Font.BOLD);
        if (font.canDisplayUpTo(printableName) >= 0) {
            throw new IllegalStateException(
                    "The server font cannot display the SNS thumbnail text. Install Noto Sans CJK KR.");
        }
        graphics.setFont(font);
        FontMetrics metrics = graphics.getFontMetrics();
        int boxWidth = WIDTH - REVIEW_CAPTION_HORIZONTAL_MARGIN * 2;
        int textWidth = boxWidth - REVIEW_CAPTION_HORIZONTAL_PADDING * 2;
        List<String> lines = wrap(printableName, metrics, textWidth, REVIEW_CAPTION_MAX_LINES);
        int lineGap = 10;
        int textHeight = lines.size() * metrics.getHeight()
                + Math.max(0, lines.size() - 1) * lineGap;
        int boxHeight = textHeight + REVIEW_CAPTION_VERTICAL_PADDING * 2;
        int boxX = REVIEW_CAPTION_HORIZONTAL_MARGIN;
        int boxY = HEIGHT - REVIEW_CAPTION_BOTTOM_MARGIN - boxHeight;

        graphics.setColor(new Color(15, 15, 15, 230));
        graphics.fillRect(boxX, boxY, boxWidth, boxHeight);

        graphics.setColor(Color.WHITE);
        int baseline = boxY + REVIEW_CAPTION_VERTICAL_PADDING + metrics.getAscent();
        for (String line : lines) {
            int textX = (WIDTH - metrics.stringWidth(line)) / 2;
            graphics.drawString(line, textX, baseline);
            baseline += metrics.getHeight() + lineGap;
        }
    }

    private BufferedImage composeCovered(BufferedImage source) {
        BufferedImage canvas = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = canvas.createGraphics();
        configure(graphics);
        drawCover(graphics, source, WIDTH, HEIGHT);
        graphics.dispose();
        return canvas;
    }

    private BufferedImage readTrustedImage(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            throw new IllegalArgumentException("SNS image is required.");
        }
        try {
            byte[] bytes;
            if (sourceUrl.startsWith("/uploads/")) {
                Path path = resolveUploadPath(sourceUrl.substring("/uploads/".length()));
                path = preferOriginalSibling(path);
                bytes = Files.readAllBytes(path);
            } else if (sourceUrl.startsWith("/api/social/images/")) {
                String relative = sourceUrl.substring("/api/social/images/".length());
                Path path = resolveUploadPath("social/" + relative);
                bytes = Files.readAllBytes(path);
            } else if (sourceUrl.startsWith("https://") || sourceUrl.startsWith("http://")) {
                bytes = download(sourceUrl);
            } else {
                throw new IllegalArgumentException("Unsupported SNS image URL.");
            }
            if (bytes.length == 0 || bytes.length > MAX_SOURCE_BYTES) {
                throw new IllegalArgumentException("SNS image size is invalid.");
            }
            BufferedImage image;
            try {
                image = ImmutableImage.loader().fromBytes(bytes).awt();
            } catch (Exception ignored) {
                image = ImageIO.read(new ByteArrayInputStream(bytes));
            }
            validateDecodedImage(image);
            return image;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("SNS image loading failed.", e);
        } catch (IOException e) {
            throw new IllegalStateException("SNS image loading failed.", e);
        }
    }

    private BufferedImage decodeUpload(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_SOURCE_BYTES) {
            throw new IllegalArgumentException("SNS image size is invalid.");
        }
        try {
            byte[] bytes = file.getBytes();
            BufferedImage image;
            try {
                image = ImmutableImage.loader().fromBytes(bytes).awt();
            } catch (Exception ignored) {
                image = ImageIO.read(new ByteArrayInputStream(bytes));
            }
            validateDecodedImage(image);
            return image;
        } catch (IOException e) {
            throw new IllegalStateException("SNS image upload could not be read.", e);
        }
    }

    private byte[] download(String url) throws IOException, InterruptedException {
        URI uri = URI.create(url);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getPort() != -1) {
            throw new IllegalArgumentException("Only HTTPS social images are allowed.");
        }
        validatePublicHost(uri.getHost());
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(java.time.Duration.ofSeconds(15))
                .header("User-Agent", "CaskByCask-Social-Publisher/1.0")
                .GET().build();
        HttpResponse<InputStream> response = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(java.time.Duration.ofSeconds(5))
                .build()
                .send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (InputStream body = response.body()) {
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IOException("Image server returned HTTP " + response.statusCode());
            }
            long contentLength = response.headers().firstValueAsLong("Content-Length").orElse(-1L);
            if (contentLength > MAX_SOURCE_BYTES) {
                throw new IOException("Image server response is too large.");
            }
            return body.readNBytes((int) MAX_SOURCE_BYTES + 1);
        }
    }

    private static void validateDecodedImage(BufferedImage image) {
        if (image == null || image.getWidth() < 1 || image.getHeight() < 1) {
            throw new IllegalArgumentException("SNS image cannot be decoded.");
        }
        long pixels = (long) image.getWidth() * image.getHeight();
        if (pixels > MAX_SOURCE_PIXELS) {
            throw new IllegalArgumentException("SNS image dimensions are too large.");
        }
    }

    private void validatePublicHost(String host) throws IOException {
        String siteHost = URI.create(properties.getSiteUrl()).getHost();
        String mediaHost = URI.create(properties.getPublicMediaBaseUrl()).getHost();
        if (host.equalsIgnoreCase(siteHost) || host.equalsIgnoreCase(mediaHost)) return;
        for (InetAddress address : InetAddress.getAllByName(host)) {
            if (address.isAnyLocalAddress() || address.isLoopbackAddress()
                    || address.isLinkLocalAddress() || address.isSiteLocalAddress()
                    || address.isMulticastAddress()) {
                throw new IllegalArgumentException("Private network image URLs are not allowed.");
            }
        }
    }

    private Path preferOriginalSibling(Path path) throws IOException {
        if (!path.getFileName().toString().toLowerCase().endsWith(".webp")) return path;
        String baseName = path.getFileName().toString().replaceFirst("(?i)\\.webp$", "");
        Path parent = path.getParent();
        if (parent == null || !Files.isDirectory(parent)) return path;
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(parent, baseName + ".*")) {
            for (Path candidate : stream) {
                if (!candidate.getFileName().toString().toLowerCase().endsWith(".webp")) return candidate;
            }
        }
        return path;
    }

    private Path resolveUploadPath(String relative) {
        Path base = basePath();
        Path resolved = base.resolve(relative).normalize();
        if (!resolved.startsWith(base)) throw new IllegalArgumentException("Invalid social image path.");
        return resolved;
    }

    private Path basePath() {
        return Paths.get(basePathValue).toAbsolutePath().normalize();
    }

    private String writeJpeg(BufferedImage image, String prefix) {
        try {
            byte[] bytes = encodeJpeg(image, 0.85f);
            if (bytes.length > MAX_OUTPUT_BYTES) bytes = encodeJpeg(image, 0.72f);
            if (bytes.length > MAX_OUTPUT_BYTES) {
                throw new IllegalStateException("Generated SNS image exceeds 8MB.");
            }
            String yearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
            String fileName = prefix + "-" + UUID.randomUUID() + ".jpg";
            Path directory = basePath().resolve("social").resolve(yearMonth).normalize();
            if (!directory.startsWith(basePath())) throw new IllegalStateException("Invalid social image target.");
            Files.createDirectories(directory);
            Files.write(directory.resolve(fileName), bytes, StandardOpenOption.CREATE_NEW);
            return "/api/social/images/" + yearMonth + "/" + fileName;
        } catch (IOException e) {
            throw new IllegalStateException("Generated SNS image could not be saved.", e);
        }
    }

    private static byte[] encodeJpeg(BufferedImage image, float quality) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam params = writer.getDefaultWriteParam();
        params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        params.setCompressionQuality(quality);
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
             ImageOutputStream imageOutput = ImageIO.createImageOutputStream(output)) {
            writer.setOutput(imageOutput);
            writer.write(null, new IIOImage(image, null, null), params);
            writer.dispose();
            return output.toByteArray();
        }
    }

    private static void drawCover(Graphics2D graphics, BufferedImage source, int width, int height) {
        double scale = Math.max((double) width / source.getWidth(), (double) height / source.getHeight());
        int drawWidth = (int) Math.ceil(source.getWidth() * scale);
        int drawHeight = (int) Math.ceil(source.getHeight() * scale);
        graphics.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2,
                drawWidth, drawHeight, null);
    }

    private static void configure(Graphics2D graphics) {
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
    }

    private static Font preferredFont(int size, int style) {
        String[] candidates = {"Noto Sans CJK KR", "Noto Sans KR", "Malgun Gothic", Font.SANS_SERIF};
        GraphicsEnvironment environment = GraphicsEnvironment.getLocalGraphicsEnvironment();
        java.util.Set<String> installed = java.util.Set.of(environment.getAvailableFontFamilyNames());
        for (String candidate : candidates) {
            if (installed.contains(candidate) || Font.SANS_SERIF.equals(candidate)) {
                return new Font(candidate, style, size);
            }
        }
        return new Font(Font.SANS_SERIF, style, size);
    }

    private static List<String> wrap(String text, FontMetrics metrics, int maxWidth, int maxLines) {
        List<String> lines = new ArrayList<>();
        String normalized = text.replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) return List.of("");
        StringBuilder current = new StringBuilder();
        boolean truncated = false;
        int offset = 0;
        while (offset < normalized.length()) {
            int codePoint = normalized.codePointAt(offset);
            offset += Character.charCount(codePoint);
            String candidate = current.toString() + new String(Character.toChars(codePoint));
            if (metrics.stringWidth(candidate) <= maxWidth || current.isEmpty()) {
                current.appendCodePoint(codePoint);
                continue;
            }
            if (lines.size() == maxLines - 1) {
                truncated = true;
                break;
            }
            lines.add(current.toString().stripTrailing());
            current.setLength(0);
            if (codePoint != ' ') current.appendCodePoint(codePoint);
        }
        if (!current.isEmpty() && lines.size() < maxLines) lines.add(current.toString());
        if (truncated && !lines.isEmpty()) {
            int lastIndex = lines.size() - 1;
            String last = lines.get(lastIndex);
            while (!last.isEmpty() && metrics.stringWidth(last + "…") > maxWidth) {
                int lastCodePoint = last.offsetByCodePoints(last.length(), -1);
                last = last.substring(0, lastCodePoint);
            }
            lines.set(lastIndex, last + "…");
        }
        return lines;
    }
}
