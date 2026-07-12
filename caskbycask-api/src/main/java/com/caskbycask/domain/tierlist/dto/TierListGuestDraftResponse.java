package com.caskbycask.domain.tierlist.dto;

import java.time.LocalDateTime;

public record TierListGuestDraftResponse(
        String token,
        LocalDateTime expiresAt,
        TierListGuestDraftRequest content
) {
}
