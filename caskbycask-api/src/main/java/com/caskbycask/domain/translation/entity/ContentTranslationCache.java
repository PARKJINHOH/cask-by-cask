package com.caskbycask.domain.translation.entity;

import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "content_translation_cache",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_translation_cache_resource_target",
                columnNames = {"resource_type", "resource_id", "target_language"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ContentTranslationCache extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", length = 30, nullable = false)
    private TranslationResourceType resourceType;

    @Column(name = "resource_id", nullable = false)
    private Long resourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_language", length = 5, nullable = false)
    private TranslationLanguage targetLanguage;

    @Column(name = "source_hash", length = 64, nullable = false)
    private String sourceHash;

    @Lob
    @Column(name = "translated_fields", nullable = false, columnDefinition = "LONGTEXT")
    private String translatedFields;

    public void replace(String sourceHash, String translatedFields) {
        this.sourceHash = sourceHash;
        this.translatedFields = translatedFields;
    }
}
