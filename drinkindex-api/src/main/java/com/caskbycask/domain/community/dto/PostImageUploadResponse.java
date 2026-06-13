package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.PostImage;
import lombok.Getter;

@Getter
public class PostImageUploadResponse {

    private final Long id;
    private final String imageUrl;
    private final String originalFileName;

    private PostImageUploadResponse(PostImage image) {
        this.id               = image.getId();
        this.imageUrl         = image.getImageUrl();
        this.originalFileName = image.getOriginalFileName();
    }

    public static PostImageUploadResponse from(PostImage image) {
        return new PostImageUploadResponse(image);
    }
}
