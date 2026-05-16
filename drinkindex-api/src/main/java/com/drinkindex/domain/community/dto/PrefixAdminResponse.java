package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.PostPrefix;
import lombok.Getter;

@Getter
public class PrefixAdminResponse {

    private final Long id;
    private final String boardType;
    private final String name;
    private final String colorHex;
    private final Boolean isActive;
    private final Integer sortOrder;

    private PrefixAdminResponse(PostPrefix p) {
        this.id        = p.getId();
        this.boardType = p.getBoardType().name();
        this.name      = p.getName();
        this.colorHex  = p.getColorHex();
        this.isActive  = p.getIsActive();
        this.sortOrder = p.getSortOrder();
    }

    public static PrefixAdminResponse from(PostPrefix p) {
        return new PrefixAdminResponse(p);
    }
}
