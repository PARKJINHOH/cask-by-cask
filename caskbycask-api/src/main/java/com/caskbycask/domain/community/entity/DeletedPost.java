package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.BoardType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

// deleted_posts는 BaseTimeEntity 없이 직접 시간 컬럼 관리
@Entity
@Table(name = "deleted_posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("삭제된 게시글 보관")
public class DeletedPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false)
    @Comment("원글 식별자(posts.id)")
    private Long originalPostId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("게시판 유형 — FREE/NOTICE")
    private BoardType boardType;

    @Column(nullable = false)
    @Comment("원작성자(users.id)")
    private Long authorId;

    @Column(nullable = false, length = 300)
    @Comment("원글 제목")
    private String title;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(원본)")
    private String content;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(XSS 필터링)")
    private String contentSanitized;

    @Column(nullable = false)
    @Comment("삭제 처리자(users.id)")
    private Long deletedBy;

    @Column(length = 500)
    @Comment("삭제 사유")
    private String deleteReason;

    @Column(nullable = false)
    @Comment("삭제 일시")
    private LocalDateTime deletedAt;

    @Column(nullable = false)
    @Comment("원글 작성 일시")
    private LocalDateTime originalCreatedAt;
}
