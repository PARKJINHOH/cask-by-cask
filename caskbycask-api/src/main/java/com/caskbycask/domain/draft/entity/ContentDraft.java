package com.caskbycask.domain.draft.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 게시글/공지 작성 임시저장(draft).
 * 사용자별 + draftKey(예: "POST:FREE", "POST:NOTICE", "NOTICE") 당 여러 건 보관(목록).
 * 임시저장 버튼 클릭 시 목록에 누적되며, 사용자가 목록 모달에서 선택해 불러온다.
 * (draftKey 당 최대 10개 제한 — ContentDraftService 에서 enforce)
 */
@Entity
@Table(
        name = "content_draft",
        indexes = {
                @Index(name = "idx_content_draft_user_key", columnList = "user_id, draft_key")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ContentDraft extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "draft_key", nullable = false, length = 50)
    private String draftKey;

    @Column(length = 300)
    private String title;

    // 원본 HTML (작성 중 내용). Sanitize는 실제 게시 시점에 수행.
    @Column(columnDefinition = "LONGTEXT")
    private String content;

    // 말머리/카테고리 등 부가 정보 JSON (프론트에서 직렬화)
    @Column(columnDefinition = "TEXT")
    private String meta;

    public void update(String title, String content, String meta) {
        this.title = title;
        this.content = content;
        this.meta = meta;
    }
}
