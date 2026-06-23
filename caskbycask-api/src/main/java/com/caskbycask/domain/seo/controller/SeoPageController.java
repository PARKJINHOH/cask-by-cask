package com.caskbycask.domain.seo.controller;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

@Slf4j
@RestController
@RequiredArgsConstructor
public class SeoPageController {

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;

    @Value("${seo.index-path}")
    private String indexPath;

    @Value("${seo.site-url:https://caskbycask.net}")
    private String siteUrl;

    // Cache the loaded index.html content in memory to avoid constant disk reads.
    private String cachedIndexHtml = null;
    private long lastLoadedTime = 0;

    @GetMapping(value = {
            "/spirits/{id:[0-9]+}",
            "/spirits/{id:[0-9]+}-{slug}",
            "/ko/spirits/{id:[0-9]+}",
            "/ko/spirits/{id:[0-9]+}-{slug}",
            "/en/spirits/{id:[0-9]+}",
            "/en/spirits/{id:[0-9]+}-{slug}"
    }, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> serveSpiritPage(@PathVariable Long id, HttpServletRequest request) {
        String uri = request.getRequestURI();
        boolean isEn = uri.startsWith("/en/");

        // 1. Fetch Spirit from DB
        Optional<Spirit> spiritOpt = spiritRepository.findById(id);
        if (spiritOpt.isEmpty()) {
            return serveDefaultIndexHtml();
        }
        Spirit spirit = spiritOpt.get();

        // 2. Load index.html
        String html = loadIndexHtml();
        if (html == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error loading page template");
        }

        // 3. Extract metadata
        String nameKo = spirit.getNameKo();
        String nameEn = spirit.getNameEn();
        if (spirit.getVariantType() != null && spirit.getVariantType() != VariantType.NONE) {
            if (spirit.getVariantValue() != null && !spirit.getVariantValue().trim().isEmpty()) {
                nameKo = nameKo + " " + spirit.getVariantValue().trim();
            }
            String valEn = spirit.getVariantValueEn() != null && !spirit.getVariantValueEn().trim().isEmpty()
                    ? spirit.getVariantValueEn().trim()
                    : (spirit.getVariantValue() != null ? spirit.getVariantValue().trim() : "");
            if (nameEn != null && !nameEn.trim().isEmpty()) {
                if (!valEn.isEmpty()) {
                    nameEn = nameEn + " " + valEn;
                }
            } else {
                if (!valEn.isEmpty()) {
                    nameEn = valEn;
                }
            }
        }
        String primaryName = isEn ? (nameEn != null && !nameEn.isEmpty() ? nameEn : nameKo) : nameKo;
        String secondaryName = isEn ? nameKo : nameEn;

        String producerName = "";
        if (spirit.getProducer() != null) {
            producerName = isEn ?
                    (spirit.getProducer().getNameEn() != null ? spirit.getProducer().getNameEn() : spirit.getProducer().getNameKo()) :
                    spirit.getProducer().getNameKo();
        }

        String country = spirit.getCountry() != null ? spirit.getCountry() : "";
        String category = spirit.getCategory() != null ? spirit.getCategory().name() : "";

        // Build Title
        String pageTitle = primaryName + " — CaskByCask";

        // Build Description
        String description = isEn ?
                String.format("%s — %s %s. CaskByCask tasting notes, ratings, and user reviews.", primaryName, producerName, country).trim() :
                String.format("%s — %s %s. CaskByCask 테이스팅 노트와 사용자 평점, 리뷰.", primaryName, producerName, country).trim();

        // Resolve Image
        Optional<SpiritImage> primaryImageOpt = spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(id);
        String relativeImgUrl = primaryImageOpt.map(SpiritImage::getImageUrl).orElse("");
        if (relativeImgUrl.isEmpty()) {
            // Check if there are any images
            var images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(id);
            if (!images.isEmpty()) {
                relativeImgUrl = images.get(0).getImageUrl();
            }
        }
        String imageUrl = siteUrl + "/og-image.png"; // Fallback default
        if (!relativeImgUrl.isEmpty()) {
            imageUrl = relativeImgUrl.startsWith("http") ? relativeImgUrl : siteUrl + relativeImgUrl;
        }

        // Resolve Canonical URL
        String canonicalUrl = siteUrl + (isEn ? "/en" : "/ko") + "/spirits/" + id;
        int spiritsIndex = uri.indexOf("/spirits/");
        if (spiritsIndex != -1) {
            String pathAfterSpirits = uri.substring(spiritsIndex + 9); // e.g. "8-glenallachie-12"
            int hyphenIndex = pathAfterSpirits.indexOf('-');
            if (hyphenIndex != -1) {
                String slug = pathAfterSpirits.substring(hyphenIndex + 1);
                canonicalUrl += "-" + slug;
            }
        }

        // 4. Build Product JSON-LD structured data
        String jsonLd = generateProductJsonLd(spirit, primaryName, secondaryName, producerName, country, category, imageUrl);

        // 5. Replace placeholders in index.html
        String resultHtml = injectMetaTags(html, pageTitle, description, canonicalUrl, imageUrl, jsonLd);

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(resultHtml);
    }

    private synchronized String loadIndexHtml() {
        // Read file only if not cached, or reload every 30 seconds for dynamic changes (or simple caching)
        long now = System.currentTimeMillis();
        if (cachedIndexHtml != null && (now - lastLoadedTime < 30000)) {
            return cachedIndexHtml;
        }
        try {
            Path path = Paths.get(indexPath);
            if (Files.exists(path)) {
                byte[] bytes = Files.readAllBytes(path);
                cachedIndexHtml = new String(bytes, StandardCharsets.UTF_8);
                lastLoadedTime = now;
                return cachedIndexHtml;
            } else {
                log.error("index.html template file not found at path: {}", indexPath);
                return cachedIndexHtml; // return old cache if exists, or null
            }
        } catch (IOException e) {
            log.error("Failed to read index.html template file", e);
            return cachedIndexHtml;
        }
    }

    private ResponseEntity<String> serveDefaultIndexHtml() {
        String html = loadIndexHtml();
        if (html != null) {
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(html);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Not Found");
    }

    private String injectMetaTags(String html, String title, String description, String canonicalUrl, String imageUrl, String jsonLd) {
        // Add title tag inside <head> (since index.html has no title tag by default)
        if (html.contains("<head>")) {
            html = html.replace("<head>", "<head>\n    <title>" + title + "</title>");
        }

        // Replace Meta Description
        html = html.replaceAll("<meta name=\"description\" content=\"[^\"]*\" />",
                "<meta name=\"description\" content=\"" + escapeHtml(description) + "\" />");

        // Replace Canonical URL
        html = html.replaceAll("<link rel=\"canonical\" href=\"[^\"]*\" />",
                "<link rel=\"canonical\" href=\"" + canonicalUrl + "\" />");

        // Replace Open Graph Title, Description, Url, Image
        html = html.replaceAll("<meta property=\"og:title\" content=\"[^\"]*\" />",
                "<meta property=\"og:title\" content=\"" + escapeHtml(title) + "\" />");
        html = html.replaceAll("<meta property=\"og:description\" content=\"[^\"]*\" />",
                "<meta property=\"og:description\" content=\"" + escapeHtml(description) + "\" />");
        html = html.replaceAll("<meta property=\"og:url\" content=\"[^\"]*\" />",
                "<meta property=\"og:url\" content=\"" + canonicalUrl + "\" />");
        html = html.replaceAll("<meta property=\"og:image\" content=\"[^\"]*\" />",
                "<meta property=\"og:image\" content=\"" + imageUrl + "\" />");

        // Replace Twitter Title, Description, Image
        html = html.replaceAll("<meta name=\"twitter:title\" content=\"[^\"]*\" />",
                "<meta name=\"twitter:title\" content=\"" + escapeHtml(title) + "\" />");
        html = html.replaceAll("<meta name=\"twitter:description\" content=\"[^\"]*\" />",
                "<meta name=\"twitter:description\" content=\"" + escapeHtml(description) + "\" />");
        html = html.replaceAll("<meta name=\"twitter:image\" content=\"[^\"]*\" />",
                "<meta name=\"twitter:image\" content=\"" + imageUrl + "\" />");

        // Inject JSON-LD Script before </head>
        if (html.contains("</head>")) {
            html = html.replace("</head>", "\n    <script type=\"application/ld+json\">\n" + jsonLd + "\n    </script>\n</head>");
        }

        return html;
    }

    private String generateProductJsonLd(Spirit spirit, String name, String alternateName, String brand, String country, String category, String imageUrl) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("      \"@context\": \"https://schema.org\",\n");
        sb.append("      \"@type\": \"Product\",\n");
        sb.append("      \"name\": \"").append(escapeJson(name)).append("\"");

        if (alternateName != null && !alternateName.isEmpty()) {
            sb.append(",\n      \"alternateName\": \"").append(escapeJson(alternateName)).append("\"");
        }
        if (imageUrl != null && !imageUrl.isEmpty()) {
            sb.append(",\n      \"image\": \"").append(imageUrl).append("\"");
        }
        if (category != null && !category.isEmpty()) {
            sb.append(",\n      \"category\": \"").append(escapeJson(category)).append("\"");
        }
        if (country != null && !country.isEmpty()) {
            sb.append(",\n      \"countryOfOrigin\": \"").append(escapeJson(country)).append("\"");
        }
        if (brand != null && !brand.isEmpty()) {
            sb.append(",\n      \"brand\": {\n");
            sb.append("        \"@type\": \"Brand\",\n");
            sb.append("        \"name\": \"").append(escapeJson(brand)).append("\"\n");
            sb.append("      }");
        }

        // Aggregate Rating
        if (spirit.getAvgScore() != null && spirit.getReviewCount() != null && spirit.getReviewCount() > 0) {
            sb.append(",\n      \"aggregateRating\": {\n");
            sb.append("        \"@type\": \"AggregateRating\",\n");
            sb.append("        \"ratingValue\": ").append(spirit.getAvgScore()).append(",\n");
            sb.append("        \"reviewCount\": ").append(spirit.getReviewCount()).append(",\n");
            sb.append("        \"bestRating\": 100,\n");
            sb.append("        \"worstRating\": 0\n");
            sb.append("      }");
        }

        sb.append("\n    }");
        return sb.toString();
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
