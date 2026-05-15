package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.PostPrefix;
import lombok.Getter;

@Getter
public class PrefixInfo {

    private final Long id;
    private final String name;
    private final String colorHex;

    private PrefixInfo(PostPrefix prefix) {
        this.id       = prefix.getId();
        this.name     = prefix.getName();
        this.colorHex = prefix.getColorHex();
    }

    public static PrefixInfo from(PostPrefix prefix) {
        return new PrefixInfo(prefix);
    }
}
