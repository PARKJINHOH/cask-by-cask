package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.community.entity.enums.BoardType;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateBoardPermissionsRequest(
        @NotNull List<BoardType> boardTypes
) {}
