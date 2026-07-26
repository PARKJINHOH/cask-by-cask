package com.caskbycask.domain.social.service;

public record SocialPublicationContent(
        String caption,
        String sourceImageUrl,
        String destinationPath,
        String displayTitle,
        String imageTitle,
        String imageLabel
) {
    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle) {
        this(caption, sourceImageUrl, destinationPath, displayTitle, displayTitle, null);
    }

    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle,
                                    String imageTitle) {
        this(caption, sourceImageUrl, destinationPath, displayTitle, imageTitle, null);
    }
}
