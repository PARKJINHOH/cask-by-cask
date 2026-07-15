package com.caskbycask.domain.tastetree.entity;

import com.caskbycask.domain.tastetree.entity.enums.TasteTreeVersionStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "taste_tree_versions", indexes = {
        @Index(name = "idx_taste_tree_versions_tree_status", columnList = "tree_id, status, version_number")
}, uniqueConstraints = {
        @UniqueConstraint(name = "ux_taste_tree_versions_number", columnNames = {"tree_id", "version_number"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TasteTreeVersion extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tree_id", nullable = false)
    private TasteTree tree;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TasteTreeVersionStatus status;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 1000)
    private String description;

    @Lob
    @Column(name = "content_json", nullable = false, columnDefinition = "LONGTEXT")
    private String contentJson;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    public void updateDraft(String title, String description, String contentJson) {
        if (status != TasteTreeVersionStatus.DRAFT) {
            throw new IllegalStateException("Only a draft version can be changed.");
        }
        this.title = title;
        this.description = description;
        this.contentJson = contentJson;
    }

    public void publish() {
        if (status != TasteTreeVersionStatus.DRAFT) {
            throw new IllegalStateException("Only a draft version can be published.");
        }
        this.status = TasteTreeVersionStatus.PUBLISHED;
        this.publishedAt = LocalDateTime.now();
    }

    public void archive() {
        if (status == TasteTreeVersionStatus.PUBLISHED) {
            this.status = TasteTreeVersionStatus.ARCHIVED;
        }
    }
}
