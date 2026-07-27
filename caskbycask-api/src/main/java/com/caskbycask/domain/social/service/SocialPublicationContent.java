package com.caskbycask.domain.social.service;

public record SocialPublicationContent(
        String caption,
        String sourceImageUrl,
        String destinationPath,
        String displayTitle,
        String imageTitle,
        String imageLabel,
        String imageIdentifier
) {
    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle) {
        this(caption, sourceImageUrl, destinationPath, displayTitle, displayTitle, null, null);
    }

    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle,
                                    String imageTitle) {
        this(caption, sourceImageUrl, destinationPath, displayTitle, imageTitle, null, null);
    }

    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle,
                                    String imageTitle, String imageLabel) {
        this(caption, sourceImageUrl, destinationPath, displayTitle, imageTitle, imageLabel, null);
    }
}
