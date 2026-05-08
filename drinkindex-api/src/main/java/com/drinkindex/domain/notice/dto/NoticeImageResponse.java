package com.drinkindex.domain.notice.dto;

import com.drinkindex.domain.notice.entity.NoticeImage;
import lombok.Getter;

@Getter
public class NoticeImageResponse {

    private final Long id;
    private final String imageUrl;
    private final String originalFileName;
    private final Long fileSize;
    private final String mimeType;

    private NoticeImageResponse(Long id, String imageUrl, String originalFileName,
                                Long fileSize, String mimeType) {
        this.id = id;
        this.imageUrl = imageUrl;
        this.originalFileName = originalFileName;
        this.fileSize = fileSize;
        this.mimeType = mimeType;
    }

    public static NoticeImageResponse from(NoticeImage image) {
        return new NoticeImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getOriginalFileName(),
                image.getFileSize(),
                image.getMimeType()
        );
    }
}
