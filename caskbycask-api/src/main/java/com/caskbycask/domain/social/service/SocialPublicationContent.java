package com.caskbycask.domain.social.service;

public record SocialPublicationContent(
        String caption,
        String sourceImageUrl,
        String destinationPath,
        String displayTitle
) {
}
