package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.enums.BoardType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class SavePrefixRequest {

    @NotNull
    private BoardType boardType;

    @NotBlank
    @Size(max = 20)
    private String name;

    @Size(max = 7)
    private String colorHex;

    private Boolean isActive = true;

    private Integer sortOrder = 0;
}
