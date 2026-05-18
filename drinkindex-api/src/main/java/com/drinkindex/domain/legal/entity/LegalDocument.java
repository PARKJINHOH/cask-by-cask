package com.drinkindex.domain.legal.entity;

import com.drinkindex.domain.legal.entity.enums.LegalDocumentType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

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
public class LegalDocument extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LegalDocumentType type;

    @Column(nullable = false, length = 50)
    private String version;

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String content;

    @Column(name = "content_sanitized", columnDefinition = "LONGTEXT", nullable = false)
    private String contentSanitized;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
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
