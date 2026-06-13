package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.community.entity.enums.BoardType;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateBoardPermissionsRequest(
        @NotNull List<BoardType> boardTypes
) {}
