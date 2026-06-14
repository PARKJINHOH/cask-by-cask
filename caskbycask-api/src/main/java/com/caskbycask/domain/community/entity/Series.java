package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "series")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Series extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @Comment("작성자(users.id)")
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("게시판 유형 — FREE/NOTICE")
    private BoardType boardType;

    @Column(nullable = false, length = 200)
    @Comment("시리즈 제목")
    private String title;

    @Column(length = 500)
    @Comment("시리즈 설명")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    @Comment("게시글 수")
    private Integer postCount = 0;

    public void incrementPostCount() { this.postCount++; }
    public void decrementPostCount() { if (this.postCount > 0) this.postCount--; }

    public void update(String title, String description) {
        this.title = title;
        this.description = description;
    }
}
