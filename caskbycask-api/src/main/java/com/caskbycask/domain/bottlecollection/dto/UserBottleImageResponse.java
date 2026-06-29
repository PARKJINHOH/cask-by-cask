package com.caskbycask.domain.bottlecollection.dto;

import com.caskbycask.domain.bottlecollection.entity.UserBottleImage;

public record UserBottleImageResponse(
    Long id,
    String imageUrl
) {
    public static UserBottleImageResponse from(UserBottleImage image) {
        return new UserBottleImageResponse(image.getId(), image.getImageUrl());
    }
}
