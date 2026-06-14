package com.caskbycask.domain.legal.entity;

import com.caskbycask.domain.legal.entity.enums.LegalDocumentType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "legal_documents",
        indexes = {
                @Index(name = "idx_legal_type_active", columnList = "type, is_active")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("약관·개인정보 처리방침 문서")
public class LegalDocument extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Comment("문서 유형 — TERMS(약관)/PRIVACY_POLICY(개인정보)")
    private LegalDocumentType type;

    @Column(nullable = false, length = 50)
    @Comment("버전")
    private String version;

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    @Comment("본문 HTML(원본)")
    private String content;

    @Column(name = "content_sanitized", columnDefinition = "LONGTEXT", nullable = false)
    @Comment("본문 HTML(XSS 필터링)")
    private String contentSanitized;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    @Comment("현재 적용본 여부")
    private Boolean isActive = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    @Comment("작성 관리자(users.id)")
    private User author;

    public void update(String version, String content, String contentSanitized) {
        this.version = version;
        this.content = content;
        this.contentSanitized = contentSanitized;
    }

    public void activate() {
        this.isActive = true;
    }

    public void deactivate() {
        this.isActive = false;
    }
}
