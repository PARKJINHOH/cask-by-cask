package com.caskbycask.domain.translation.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TranslationLanguage {
    KO("ko"),
    EN("en");

    private final String code;

    TranslationLanguage(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static TranslationLanguage from(String value) {
        if (value != null) {
            for (TranslationLanguage language : values()) {
                if (language.code.equalsIgnoreCase(value)) return language;
            }
        }
        throw new IllegalArgumentException("Unsupported translation language");
    }
}
