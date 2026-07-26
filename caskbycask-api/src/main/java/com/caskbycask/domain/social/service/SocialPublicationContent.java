package com.caskbycask.domain.social.service;

public record SocialPublicationContent(
        String caption,
        String sourceImageUrl,
        String destinationPath,
        String displayTitle,
        String imageTitle
) {
    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle) {
        this(caption, sourceImageUrl, destinationPath, displayTitle, displayTitle);
    }
}
