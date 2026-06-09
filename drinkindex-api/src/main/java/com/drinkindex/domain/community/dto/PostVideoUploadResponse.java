package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.PostVideo;
import lombok.Getter;

@Getter
public class PostVideoUploadResponse {

    private final Long id;
    private final String videoUrl;
    private final String originalFileName;
    private final String mimeType;

    private PostVideoUploadResponse(PostVideo video) {
        this.id               = video.getId();
        this.videoUrl         = video.getVideoUrl();
        this.originalFileName = video.getOriginalFileName();
        this.mimeType         = video.getMimeType();
    }

    public static PostVideoUploadResponse from(PostVideo video) {
        return new PostVideoUploadResponse(video);
    }
}
