package com.caskbycask.domain.social.service;

import lombok.Getter;

@Getter
public class SocialProviderException extends RuntimeException {

    private final String providerCode;
    private final boolean retryable;
    private final boolean outcomeUncertain;

    public SocialProviderException(String providerCode, String message,
                                   boolean retryable, boolean outcomeUncertain, Throwable cause) {
        super(message, cause);
        this.providerCode = providerCode;
        this.retryable = retryable;
        this.outcomeUncertain = outcomeUncertain;
    }
}
