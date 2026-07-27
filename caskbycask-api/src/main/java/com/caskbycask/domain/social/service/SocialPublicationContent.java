package com.caskbycask.domain.social.service;

public record SocialPublicationContent(
        String caption,
        String sourceImageUrl,
        String destinationPath,
        String displayTitle,
        String imageTitle,
        String imageLabel,
        String imageIdentifier,
        String imageNotice
) {
    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle) {
        this(caption, sourceImageUrl, destinationPath, displayTitle,
                displayTitle, null, null, null);
    }

    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle,
                                    String imageTitle) {
        this(caption, sourceImageUrl, destinationPath, displayTitle,
                imageTitle, null, null, null);
    }

    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle,
                                    String imageTitle, String imageLabel) {
        this(caption, sourceImageUrl, destinationPath, displayTitle,
                imageTitle, imageLabel, null, null);
    }

    public SocialPublicationContent(String caption, String sourceImageUrl,
                                    String destinationPath, String displayTitle,
                                    String imageTitle, String imageLabel,
                                    String imageIdentifier) {
        this(caption, sourceImageUrl, destinationPath, displayTitle,
                imageTitle, imageLabel, imageIdentifier, null);
    }
}
