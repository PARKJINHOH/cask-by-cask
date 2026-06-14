package com.caskbycask.domain.faq.entity;

import com.caskbycask.domain.faq.entity.enums.FaqCategory;
import com.caskbycask.domain.faq.entity.enums.FaqLanguage;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "faqs",
        indexes = {
                @Index(name = "idx_faq_language",  columnList = "language"),
                @Index(name = "idx_faq_category",  columnList = "category"),
                @Index(name = "idx_faq_sort_order", columnList = "sort_order")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("자주 묻는 질문")
public class Faq extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    @Comment("언어 — KO/EN")
    private FaqLanguage language;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("분류 — WHISKY/WINE/COGNAC/SERVICE")
    private FaqCategory category;

    @Column(nullable = false, length = 500)
    @Comment("질문")
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("답변")
    private String answer;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("노출 여부")
    private Boolean isActive = true;

    public void update(FaqCategory category, String question, String answer, Boolean isActive) {
        this.category = category;
        this.question = question;
        this.answer = answer;
        this.isActive = isActive;
    }

    public void setActive(Boolean isActive) { this.isActive = isActive; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
