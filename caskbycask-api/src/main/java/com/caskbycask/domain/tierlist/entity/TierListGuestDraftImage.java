package com.caskbycask.domain.tierlist.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tier_list_guest_draft_images",
        indexes = @Index(name = "idx_tier_list_guest_draft_images_draft", columnList = "draft_id"),
        uniqueConstraints = @UniqueConstraint(name = "ux_tier_list_guest_draft_images_saved_file", columnNames = "saved_file_name"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TierListGuestDraftImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "draft_id", nullable = false)
    private TierListGuestDraft draft;

    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    @Column(name = "saved_file_name", nullable = false, length = 255)
    private String savedFileName;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "sub_path", nullable = false, length = 200)
    private String subPath;
}
