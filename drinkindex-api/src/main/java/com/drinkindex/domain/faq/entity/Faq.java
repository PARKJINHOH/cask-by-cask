package com.drinkindex.domain.faq.entity;

import com.drinkindex.domain.faq.entity.enums.FaqCategory;
import com.drinkindex.domain.faq.entity.enums.FaqLanguage;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

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
public class Faq extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private FaqLanguage language;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FaqCategory category;

    @Column(nullable = false, length = 500)
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(nullable = false)
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
