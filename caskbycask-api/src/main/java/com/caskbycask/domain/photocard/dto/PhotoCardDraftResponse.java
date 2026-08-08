package com.caskbycask.domain.photocard.dto;

import com.caskbycask.domain.photocard.entity.PhotoCardDraft;

import java.time.LocalDateTime;

/**
 * 임시저장 응답.
 * <p>
 * 목록에서는 {@code content} 를 비운다 — 배치 JSON 이 항목마다 수십 KB 라 목록만 무거워지고,
 * 정작 목록에 필요한 것은 "언제 저장한 어떤 카드인가"(이름·미리보기·기한)뿐이다.
 */
public record PhotoCardDraftResponse(
        Long id,
        String name,
        String thumbnailUrl,
        boolean hasPhoto,
        String content,
        LocalDateTime savedAt,
        LocalDateTime expiresAt
) {

    public static PhotoCardDraftResponse listItem(PhotoCardDraft draft) {
        return of(draft, null);
    }

    public static PhotoCardDraftResponse detail(PhotoCardDraft draft) {
        return of(draft, draft.getContentJson());
    }

    private static PhotoCardDraftResponse of(PhotoCardDraft draft, String content) {
        return new PhotoCardDraftResponse(
                draft.getId(),
                draft.getName(),
                draft.getThumbnailDataUri(),
                draft.hasPhoto(),
                content,
                draft.getUpdatedAt(),
                draft.getExpiresAt()
        );
    }
}
