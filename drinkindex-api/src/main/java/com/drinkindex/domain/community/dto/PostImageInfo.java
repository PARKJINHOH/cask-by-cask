package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.PostImage;
import lombok.Getter;

@Getter
public class PostImageInfo {

    private final Long id;
    private final String imageUrl;
    private final String originalFileName;

    private PostImageInfo(PostImage image) {
        this.id               = image.getId();
        this.imageUrl         = image.getImageUrl();
        this.originalFileName = image.getOriginalFileName();
    }

    public static PostImageInfo from(PostImage image) {
        return new PostImageInfo(image);
    }
}
