package com.caskbycask.domain.draft.dto;

import com.caskbycask.domain.draft.entity.ContentDraft;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class DraftResponse {

    private final Long id;
    private final String draftKey;
    private final String title;
    // 단건 조회(불러오기) 시에만 채워짐
    private final String content;
    private final String meta;
    // 목록 조회 시에만 채워짐 (본문 평문 미리보기)
    private final String preview;
    private final LocalDateTime updatedAt;

    private DraftResponse(Long id, String draftKey, String title, String content,
                          String meta, String preview, LocalDateTime updatedAt) {
        this.id = id;
        this.draftKey = draftKey;
        this.title = title;
        this.content = content;
        this.meta = meta;
        this.preview = preview;
        this.updatedAt = updatedAt;
    }

    /** 목록 항목 (content 제외, preview 포함) */
    public static DraftResponse listItem(ContentDraft draft, String preview) {
        return new DraftResponse(
                draft.getId(),
                draft.getDraftKey(),
                draft.getTitle(),
                null,
                null,
                preview,
                draft.getUpdatedAt()
        );
    }

    /** 단건/저장 결과 (content·meta 포함) */
    public static DraftResponse detail(ContentDraft draft) {
        return new DraftResponse(
                draft.getId(),
                draft.getDraftKey(),
                draft.getTitle(),
                draft.getContent(),
                draft.getMeta(),
                null,
                draft.getUpdatedAt()
        );
    }
}
