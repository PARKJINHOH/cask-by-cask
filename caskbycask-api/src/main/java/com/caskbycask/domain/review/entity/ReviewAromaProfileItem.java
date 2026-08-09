package com.caskbycask.domain.review.entity;

import com.caskbycask.domain.review.entity.enums.AromaType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "review_aroma_profile_items",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_review_aroma_item_key", columnNames = {"profile_id", "aroma_type", "aroma_key"}),
                @UniqueConstraint(name = "uk_review_aroma_item_order", columnNames = {"profile_id", "sort_order"})
        },
        indexes = @Index(name = "idx_review_aroma_item_profile", columnList = "profile_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ReviewAromaProfileItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private ReviewAromaProfile profile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, columnDefinition = "enum('CUSTOM','ID')")
    private AromaType aromaType;

    @Column(nullable = false, length = 255)
    private String aromaKey;

    @Column(nullable = false, length = 100)
    private String labelSnapshot;

    @Column(nullable = false)
    private Integer intensity;

    @Column(nullable = false)
    private Integer sortOrder;

    void attach(ReviewAromaProfile targetProfile) {
        this.profile = targetProfile;
    }
}
