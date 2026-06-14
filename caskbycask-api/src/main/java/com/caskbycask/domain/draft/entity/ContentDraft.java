package com.caskbycask.domain.draft.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("콘텐츠 임시저장")
public class ContentDraft extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;

    @Column(name = "draft_key", nullable = false, length = 50)
    @Comment("임시저장 키(화면 구분)")
    private String draftKey;

    @Column(length = 300)
    @Comment("제목")
    private String title;

    // 원본 HTML (작성 중 내용). Sanitize는 실제 게시 시점에 수행.
    @Column(columnDefinition = "LONGTEXT")
    @Comment("본문")
    private String content;

    // 말머리/카테고리 등 부가 정보 JSON (프론트에서 직렬화)
    @Column(columnDefinition = "TEXT")
    @Comment("부가 메타데이터(JSON)")
    private String meta;

    public void update(String title, String content, String meta) {
        this.title = title;
        this.content = content;
        this.meta = meta;
    }
}
