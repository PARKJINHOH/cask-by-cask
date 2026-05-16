package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class UpdatePrefixRequest {

    @Size(max = 20)
    private String name;

    @Size(max = 7)
    private String colorHex;

    private Boolean isActive;

    private Integer sortOrder;
}
