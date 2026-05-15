package com.drinkindex.domain.community.entity;

import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "series")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Series extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BoardType boardType;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private Integer postCount = 0;

    public void incrementPostCount() { this.postCount++; }
    public void decrementPostCount() { if (this.postCount > 0) this.postCount--; }

    public void update(String title, String description) {
        this.title = title;
        this.description = description;
    }
}
