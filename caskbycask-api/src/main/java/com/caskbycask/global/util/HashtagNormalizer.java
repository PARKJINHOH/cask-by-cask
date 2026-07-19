package com.caskbycask.global.util;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class HashtagNormalizer {

    public static final int MAX_HASHTAGS = 10;
    public static final int MAX_LENGTH = 30;

    private HashtagNormalizer() {}

    public static List<String> normalize(List<String> hashtags) {
        if (hashtags == null || hashtags.isEmpty()) {
            return List.of();
        }

        List<String> normalized = new ArrayList<>();
        Set<String> dedupeKeys = new LinkedHashSet<>();
        for (String raw : hashtags) {
            if (raw == null) continue;

            String value = Normalizer.normalize(raw, Normalizer.Form.NFKC)
                    .trim()
                    .replaceFirst("^#+", "")
                    .replaceAll("\\s+", "")
                    .replaceAll("[^\\p{L}\\p{N}_-]", "");
            if (value.isBlank()) continue;
            if (value.length() > MAX_LENGTH) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            if (dedupeKeys.add(value.toLowerCase(Locale.ROOT))) {
                normalized.add(value);
            }
            if (normalized.size() > MAX_HASHTAGS) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        }
        return List.copyOf(normalized);
    }
}
