package com.caskbycask.domain.tierlist.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "tier_lists",
        indexes = {
                @Index(name = "idx_tier_lists_user_updated", columnList = "user_id, updated_at")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "ux_tier_lists_share_key", columnNames = "share_key")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("사용자 티어리스트")
public class TierList extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("작성자(users.id)")
    private User user;

    @Column(nullable = false, length = 100)
    @Comment("제목")
    private String title;

    @Column(length = 1000)
    @Comment("설명")
    private String description;

    @Column(name = "share_key", nullable = false, length = 64)
    @Comment("공유 키")
    private String shareKey;

    @Builder.Default
    @Column(nullable = false)
    @Comment("내용 변경 버전")
    private Integer revision = 0;

    @Builder.Default
    @OneToMany(mappedBy = "tierList", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<TierListRow> rows = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "tierList", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<TierListItem> items = new ArrayList<>();

    public void updateMeta(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public void bumpRevision() {
        this.revision = (this.revision == null ? 0 : this.revision) + 1;
    }
}
