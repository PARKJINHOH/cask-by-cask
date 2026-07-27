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
import java.awt.font.TextLayout;
import java.awt.font.TextAttribute;
import java.awt.geom.AffineTransform;
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
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SocialImageRenderService {

    public static final int WIDTH = 1080;
    public static final int HEIGHT = 1350;
    private static final int REVIEW_CAPTION_HORIZONTAL_MARGIN = 64;
    private static final int REVIEW_CAPTION_BOTTOM_MARGIN = 48;
    private static final int REVIEW_CAPTION_HORIZONTAL_PADDING = 60;
    private static final int REVIEW_CAPTION_VERTICAL_PADDING = 28;
    private static final int REVIEW_CAPTION_START_FONT_SIZE = 58;
    private static final int REVIEW_CAPTION_MIN_FONT_SIZE = 26;
    private static final int REVIEW_CAPTION_PREFERRED_MAX_LINES = 3;
    private static final int REVIEW_IDENTIFIER_START_FONT_SIZE = 36;
    private static final int REVIEW_IDENTIFIER_MIN_FONT_SIZE = 22;
    private static final int REVIEW_IDENTIFIER_BOTTOM_GAP = 16;
    private static final float REVIEW_IDENTIFIER_OUTLINE_WIDTH = 1.0f;
    private static final int CONTENT_LABEL_X = 64;
    private static final int CONTENT_LABEL_Y = 54;
    private static final int CONTENT_LABEL_FONT_SIZE = 32;
    private static final int CONTENT_LABEL_HORIZONTAL_PADDING = 20;
    private static final int CONTENT_LABEL_VERTICAL_PADDING = 11;
    private static final long MAX_SOURCE_BYTES = 15L * 1024 * 1024;
    private static final long MAX_OUTPUT_BYTES = 8L * 1024 * 1024;
    private static final long MAX_SOURCE_PIXELS = 40_000_000L;

    @Value("${storage.local.base-path}")
    private String basePathValue;

    private final SocialPublishingProperties properties;

    public String renderReview(String sourceUrl, String spiritName, String imageLabel) {
        return renderReview(sourceUrl, spiritName, null, imageLabel);
    }

    public String renderReview(String sourceUrl, String spiritName,
                               String imageIdentifier, String imageLabel) {
        BufferedImage source = readTrustedImage(sourceUrl);
        return writeJpeg(
                composeReviewImage(source, spiritName, imageIdentifier, imageLabel),
                "review");
    }

    public String renderDirect(String sourceUrl, String imageLabel) {
        BufferedImage source = readTrustedImage(sourceUrl);
        return writeJpeg(composeCovered(source, imageLabel), "direct");
    }

    public String renderTemplate(String backgroundUrl, String text, String imageLabel) {
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
        drawContentLabel(graphics, imageLabel);
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

    BufferedImage composeReviewImage(BufferedImage source, String spiritName,
                                     String imageIdentifier, String imageLabel) {
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
        drawReviewCaption(graphics, spiritName, imageIdentifier);
        drawContentLabel(graphics, imageLabel);
        graphics.dispose();
        return canvas;
    }

    private void drawReviewCaption(Graphics2D graphics, String spiritName,
                                   String imageIdentifier) {
        String printableName = spiritName == null ? "" : spiritName.replaceAll("\\s+", " ").trim();
        if (printableName.isEmpty()) return;
        String printableIdentifier = imageIdentifier == null
                ? "" : imageIdentifier.replaceAll("\\s+", " ").trim();

        int boxWidth = WIDTH - REVIEW_CAPTION_HORIZONTAL_MARGIN * 2;
        int textWidth = boxWidth - REVIEW_CAPTION_HORIZONTAL_PADDING * 2;
        ReviewCaptionLayout layout = fitReviewCaption(graphics, printableName, textWidth);
        Font font = layout.font();
        if (font.canDisplayUpTo(printableName) >= 0) {
            throw new IllegalStateException(
                    "The server font cannot display the SNS thumbnail text. Install Noto Sans CJK KR.");
        }
        graphics.setFont(font);
        FontMetrics metrics = layout.metrics();
        List<String> lines = layout.lines();
        int lineGap = Math.max(6, font.getSize() / 7);
        int textHeight = lines.size() * metrics.getHeight()
                + Math.max(0, lines.size() - 1) * lineGap;
        int boxHeight = textHeight + REVIEW_CAPTION_VERTICAL_PADDING * 2;
        int boxX = REVIEW_CAPTION_HORIZONTAL_MARGIN;
        int boxY = HEIGHT - REVIEW_CAPTION_BOTTOM_MARGIN - boxHeight;

        graphics.setPaint(new GradientPaint(
                0, boxY, new Color(10, 10, 12, 218),
                0, boxY + boxHeight, new Color(18, 18, 21, 235)));
        graphics.fillRect(boxX, boxY, boxWidth, boxHeight);
        graphics.setColor(new Color(255, 255, 255, 38));
        graphics.drawLine(boxX, boxY, boxX + boxWidth - 1, boxY);

        graphics.setColor(Color.WHITE);
        int baseline = boxY + REVIEW_CAPTION_VERTICAL_PADDING + metrics.getAscent();
        for (String line : lines) {
            int textX = (WIDTH - metrics.stringWidth(line)) / 2;
            graphics.drawString(line, textX, baseline);
            baseline += metrics.getHeight() + lineGap;
        }
        drawReviewIdentifier(graphics, printableIdentifier, boxX, boxWidth, boxY);
    }

    private static void drawReviewIdentifier(Graphics2D graphics, String identifier,
                                             int boxX, int boxWidth, int boxY) {
        if (identifier.isEmpty()) return;

        int maxWidth = boxWidth;
        Font font = fitReviewIdentifierFont(graphics, identifier, maxWidth);
        if (font.canDisplayUpTo(identifier) >= 0) {
            throw new IllegalStateException(
                    "The server font cannot display the SNS thumbnail text. Install Noto Sans CJK KR.");
        }
        graphics.setFont(font);
        FontMetrics metrics = graphics.getFontMetrics();
        int textX = boxX;
        int baseline = boxY - REVIEW_IDENTIFIER_BOTTOM_GAP - metrics.getDescent();
        int underlineY = baseline + Math.max(3, metrics.getDescent() / 2);

        TextLayout textLayout = new TextLayout(
                identifier, font, graphics.getFontRenderContext());
        Shape textShape = textLayout.getOutline(
                AffineTransform.getTranslateInstance(textX, baseline));
        Stroke originalStroke = graphics.getStroke();
        graphics.setStroke(new BasicStroke(
                REVIEW_IDENTIFIER_OUTLINE_WIDTH * 2,
                BasicStroke.CAP_ROUND,
                BasicStroke.JOIN_ROUND));
        graphics.setColor(Color.WHITE);
        graphics.draw(textShape);

        graphics.setColor(new Color(20, 20, 23));
        graphics.fill(textShape);
        graphics.drawLine(
                textX, underlineY,
                textX + metrics.stringWidth(identifier), underlineY);
        graphics.setStroke(originalStroke);
    }

    private static Font fitReviewIdentifierFont(Graphics2D graphics,
                                                String identifier, int maxWidth) {
        Font smallest = null;
        for (int size = REVIEW_IDENTIFIER_START_FONT_SIZE;
             size >= REVIEW_IDENTIFIER_MIN_FONT_SIZE; size -= 2) {
            Font font = reviewIdentifierFont(size);
            smallest = font;
            graphics.setFont(font);
            if (graphics.getFontMetrics().stringWidth(identifier) <= maxWidth) return font;
        }
        return smallest;
    }

    private static Font reviewIdentifierFont(int size) {
        return preferredFont(size, Font.BOLD).deriveFont(Map.of(
                TextAttribute.WEIGHT, TextAttribute.WEIGHT_EXTRABOLD
        ));
    }

    private static ReviewCaptionLayout fitReviewCaption(Graphics2D graphics,
                                                        String text, int maxWidth) {
        ReviewCaptionLayout smallest = null;
        for (int size = REVIEW_CAPTION_START_FONT_SIZE;
             size >= REVIEW_CAPTION_MIN_FONT_SIZE; size -= 2) {
            Font font = reviewCaptionFont(size);
            graphics.setFont(font);
            FontMetrics metrics = graphics.getFontMetrics();
            List<String> lines = wrapFully(text, metrics, maxWidth);
            ReviewCaptionLayout candidate = new ReviewCaptionLayout(font, metrics, lines);
            smallest = candidate;
            if (lines.size() <= REVIEW_CAPTION_PREFERRED_MAX_LINES) return candidate;
        }
        return smallest;
    }

    private static Font reviewCaptionFont(int size) {
        Font base = preferredFont(size, Font.PLAIN);
        return base.deriveFont(Map.of(
                TextAttribute.WEIGHT, TextAttribute.WEIGHT_BOLD,
                TextAttribute.TRACKING, -0.01f
        ));
    }

    static List<String> wrapFully(String text, FontMetrics metrics, int maxWidth) {
        return wrap(text, metrics, maxWidth, Integer.MAX_VALUE);
    }

    private static void drawContentLabel(Graphics2D graphics, String imageLabel) {
        String printableLabel = imageLabel == null ? "" : imageLabel.replaceAll("\\s+", " ").trim();
        if (printableLabel.isEmpty()) return;

        Font font = preferredFont(CONTENT_LABEL_FONT_SIZE, Font.BOLD);
        if (font.canDisplayUpTo(printableLabel) >= 0) {
            throw new IllegalStateException(
                    "The server font cannot display the SNS thumbnail text. Install Noto Sans CJK KR.");
        }
        graphics.setFont(font);
        FontMetrics metrics = graphics.getFontMetrics();
        int boxWidth = metrics.stringWidth(printableLabel) + CONTENT_LABEL_HORIZONTAL_PADDING * 2;
        int boxHeight = metrics.getHeight() + CONTENT_LABEL_VERTICAL_PADDING * 2;

        graphics.setColor(new Color(12, 12, 14, 215));
        graphics.fillRoundRect(
                CONTENT_LABEL_X, CONTENT_LABEL_Y, boxWidth, boxHeight, 14, 14);
        graphics.setColor(new Color(255, 255, 255, 42));
        graphics.drawRoundRect(
                CONTENT_LABEL_X, CONTENT_LABEL_Y, boxWidth, boxHeight, 14, 14);

        graphics.setColor(Color.WHITE);
        int textX = CONTENT_LABEL_X + CONTENT_LABEL_HORIZONTAL_PADDING;
        int baseline = CONTENT_LABEL_Y + CONTENT_LABEL_VERTICAL_PADDING + metrics.getAscent();
        graphics.drawString(printableLabel, textX, baseline);
    }

    private BufferedImage composeCovered(BufferedImage source) {
        return composeCovered(source, null);
    }

    private BufferedImage composeCovered(BufferedImage source, String imageLabel) {
        BufferedImage canvas = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = canvas.createGraphics();
        configure(graphics);
        drawCover(graphics, source, WIDTH, HEIGHT);
        drawContentLabel(graphics, imageLabel);
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

    private record ReviewCaptionLayout(Font font, FontMetrics metrics, List<String> lines) {}
}
