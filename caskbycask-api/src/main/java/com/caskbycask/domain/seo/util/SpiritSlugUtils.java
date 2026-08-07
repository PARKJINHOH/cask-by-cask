package com.caskbycask.domain.seo.util;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class SpiritSlugUtils {

    private SpiritSlugUtils() {
    }

    public static String canonicalPathKo(Spirit spirit) {
        return canonicalPath(spirit.getId(), "ko", slugKo(spirit));
    }

    public static String canonicalPathEn(Spirit spirit) {
        return canonicalPath(spirit.getId(), "en", slugEn(spirit));
    }

    public static String canonicalPathKo(Long id, String nameKo, String seriesIdentifier,
                                         VariantType variantType, String variantValue) {
        return canonicalPath(id, "ko", slugify(displayNameKo(nameKo, seriesIdentifier, variantType, variantValue)));
    }

    public static String canonicalPathKo(Long id, String nameKo, String seriesIdentifier,
                                         VariantType variantType, String variantValue,
                                         SpiritCategory category, Integer vintageYear,
                                         WineVintageStatus vintageStatus) {
        return canonicalPath(id, "ko", slugify(displayNameKo(
                nameKo, seriesIdentifier, variantType, variantValue,
                category, vintageYear, vintageStatus)));
    }

    public static String canonicalPathEn(Long id, String nameKo, String nameEn,
                                         String seriesIdentifier, String seriesIdentifierEn,
                                         VariantType variantType, String variantValue, String variantValueEn) {
        return canonicalPath(id, "en", slugify(displayNameEn(
                nameKo, nameEn, seriesIdentifier, seriesIdentifierEn, variantType, variantValue, variantValueEn)));
    }

    public static String canonicalPathEn(Long id, String nameKo, String nameEn,
                                         String seriesIdentifier, String seriesIdentifierEn,
                                         VariantType variantType, String variantValue, String variantValueEn,
                                         SpiritCategory category, Integer vintageYear,
                                         WineVintageStatus vintageStatus) {
        return canonicalPath(id, "en", slugify(displayNameEn(
                nameKo, nameEn, seriesIdentifier, seriesIdentifierEn,
                variantType, variantValue, variantValueEn,
                category, vintageYear, vintageStatus)));
    }

    public static String slugKo(Spirit spirit) {
        return slugify(displayNameKo(spirit));
    }

    public static String slugEn(Spirit spirit) {
        return slugify(displayNameEn(spirit));
    }

    public static String displayNameKo(Spirit spirit) {
        if (!hasText(spirit.getNameKo())
                || (hasText(spirit.getNameEn())
                    && spirit.getNameKo().trim().equalsIgnoreCase(spirit.getNameEn().trim()))) {
            return displayNameEn(spirit);
        }
        return displayNameKo(
                spirit.getNameKo(), spirit.getSeriesIdentifier(), spirit.getVariantType(), spirit.getVariantValue(),
                spirit.getCategory(), spirit.getVintageYear(), wineVintageStatus(spirit));
    }

    public static String displayNameKo(String nameKo, String seriesIdentifier, VariantType variantType, String variantValue) {
        List<String> parts = new ArrayList<>();
        addIfPresent(parts, nameKo);
        if (hasEdition(variantType)) {
            addIfPresent(parts, seriesIdentifier);
            addIfPresent(parts, variantValue);
        }
        return String.join(" ", parts);
    }

    public static String displayNameKo(String nameKo, String seriesIdentifier,
                                       VariantType variantType, String variantValue,
                                       SpiritCategory category, Integer vintageYear,
                                       WineVintageStatus vintageStatus) {
        return appendWineVintage(
                displayNameKo(nameKo, seriesIdentifier, variantType, variantValue),
                category, vintageYear, vintageStatus);
    }

    public static String displayNameEn(Spirit spirit) {
        return displayNameEn(
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getSeriesIdentifier(),
                spirit.getSeriesIdentifierEn(),
                spirit.getVariantType(),
                spirit.getVariantValue(),
                spirit.getVariantValueEn(),
                spirit.getCategory(),
                spirit.getVintageYear(),
                wineVintageStatus(spirit)
        );
    }

    public static String displayNameEn(String nameKo, String nameEn,
                                       String seriesIdentifier, String seriesIdentifierEn,
                                       VariantType variantType, String variantValue, String variantValueEn) {
        List<String> parts = new ArrayList<>();
        addIfPresent(parts, firstNonBlank(nameEn, nameKo));
        if (hasEdition(variantType)) {
            addIfPresent(parts, firstNonBlank(seriesIdentifierEn, seriesIdentifier));
            addIfPresent(parts, firstNonBlank(variantValueEn, variantValue));
        }
        return String.join(" ", parts);
    }

    public static String displayNameEn(String nameKo, String nameEn,
                                       String seriesIdentifier, String seriesIdentifierEn,
                                       VariantType variantType, String variantValue, String variantValueEn,
                                       SpiritCategory category, Integer vintageYear,
                                       WineVintageStatus vintageStatus) {
        return appendWineVintage(
                displayNameEn(nameKo, nameEn, seriesIdentifier, seriesIdentifierEn,
                        variantType, variantValue, variantValueEn),
                category, vintageYear, vintageStatus);
    }

    public static String appendWineVintage(String baseName,
                                           SpiritCategory category,
                                           Integer vintageYear,
                                           WineVintageStatus vintageStatus) {
        if (category != SpiritCategory.WINE) {
            return baseName;
        }
        String suffix = vintageYear != null
                ? vintageYear.toString()
                : vintageStatus == WineVintageStatus.NON_VINTAGE ? "NV" : null;
        if (!hasText(suffix) || hasTrailingToken(baseName, suffix)) {
            return baseName;
        }
        return hasText(baseName) ? baseName.trim() + " " + suffix : suffix;
    }

    public static boolean hasEdition(Spirit spirit) {
        return hasEdition(spirit.getVariantType());
    }

    public static boolean hasEdition(VariantType variantType) {
        return variantType != null && variantType != VariantType.NONE;
    }

    public static boolean hasEdition(VariantType variantType, String variantValue) {
        return hasEdition(variantType);
    }

    public static String slugify(String value) {
        if (!hasText(value)) {
            return "";
        }
        String slug = value.toLowerCase(Locale.ROOT).trim();
        slug = slug.replaceAll("[^a-z0-9\\uAC00-\\uD7A3\\u1100-\\u11FF\\u3130-\\u318F]+", "-");
        slug = slug.replaceAll("-+", "-");
        slug = slug.replaceAll("^-|-$", "");
        return slug;
    }

    private static String canonicalPath(Long id, String lang, String slug) {
        String base = "/" + lang + "/spirits/" + id;
        return hasText(slug) ? base + "-" + slug : base;
    }

    private static void addIfPresent(List<String> parts, String value) {
        if (hasText(value)) {
            parts.add(value.trim());
        }
    }

    private static String firstNonBlank(String primary, String fallback) {
        return hasText(primary) ? primary.trim() : (hasText(fallback) ? fallback.trim() : "");
    }

    private static WineVintageStatus wineVintageStatus(Spirit spirit) {
        return spirit.getCategory() == SpiritCategory.WINE && spirit.getWineDetail() != null
                ? spirit.getWineDetail().getVintageStatus()
                : null;
    }

    private static boolean hasTrailingToken(String value, String token) {
        if (!hasText(value)) {
            return false;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        String expected = token.toLowerCase(Locale.ROOT);
        if (normalized.endsWith(expected)) {
            int start = normalized.length() - expected.length();
            return start == 0 || !Character.isLetterOrDigit(normalized.charAt(start - 1));
        }
        return normalized.endsWith(expected + ")");
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
