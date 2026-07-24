package com.caskbycask.domain.social.entity.enums;

public enum SocialPublicationStatus {
    WAITING_SOURCE,
    QUEUED,
    RENDERING,
    CONTAINER_CREATED,
    PUBLISHING,
    VERIFYING,
    PUBLISHED,
    RETRY_WAIT,
    FAILED,
    CANCELED,
    EXTERNALLY_DELETED
}
