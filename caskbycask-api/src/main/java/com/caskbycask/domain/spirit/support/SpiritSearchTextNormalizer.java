package com.caskbycask.domain.spirit.support;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class SpiritSearchTextNormalizer {

    private SpiritSearchTextNormalizer() {
    }

    public static String compact(String... values) {
        StringBuilder compact = new StringBuilder();
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            appendLettersAndDigits(compact, value);
        }
        return compact.toString();
    }

    public static KeywordParts parts(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return KeywordParts.empty();
        }

        String normalized = Normalizer.normalize(keyword, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT);
        List<String> textTokens = new ArrayList<>();
        List<String> numberTokens = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        TokenType currentType = TokenType.NONE;

        for (int i = 0; i < normalized.length(); ) {
            int cp = normalized.codePointAt(i);
            TokenType type = tokenType(cp);
            if (type == TokenType.NONE) {
                flush(current, currentType, textTokens, numberTokens);
                currentType = TokenType.NONE;
            } else {
                if (currentType != type) {
                    flush(current, currentType, textTokens, numberTokens);
                    currentType = type;
                }
                current.appendCodePoint(Character.toLowerCase(cp));
            }
            i += Character.charCount(cp);
        }
        flush(current, currentType, textTokens, numberTokens);

        return new KeywordParts(
                List.copyOf(textTokens),
                List.copyOf(numberTokens),
                compact(keyword)
        );
    }

    private static void appendLettersAndDigits(StringBuilder target, String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT);
        for (int i = 0; i < normalized.length(); ) {
            int cp = normalized.codePointAt(i);
            if (Character.isLetterOrDigit(cp)) {
                target.appendCodePoint(Character.toLowerCase(cp));
            }
            i += Character.charCount(cp);
        }
    }

    private static void flush(StringBuilder current, TokenType type,
                              List<String> textTokens, List<String> numberTokens) {
        if (current.isEmpty()) {
            return;
        }
        String token = current.toString();
        if (type == TokenType.TEXT && token.codePointCount(0, token.length()) >= 2) {
            textTokens.add(token);
        } else if (type == TokenType.NUMBER) {
            numberTokens.add(token);
        }
        current.setLength(0);
    }

    private static TokenType tokenType(int cp) {
        if (Character.isDigit(cp)) {
            return TokenType.NUMBER;
        }
        if (Character.isLetter(cp)) {
            return TokenType.TEXT;
        }
        return TokenType.NONE;
    }

    private enum TokenType {
        NONE,
        TEXT,
        NUMBER
    }

    public record KeywordParts(
            List<String> textTokens,
            List<String> numberTokens,
            String compact
    ) {
        public static KeywordParts empty() {
            return new KeywordParts(List.of(), List.of(), "");
        }

        public boolean hasToken() {
            return !textTokens.isEmpty() || !numberTokens.isEmpty();
        }

        public boolean hasCompact() {
            return compact != null && compact.length() >= 2;
        }
    }
}
