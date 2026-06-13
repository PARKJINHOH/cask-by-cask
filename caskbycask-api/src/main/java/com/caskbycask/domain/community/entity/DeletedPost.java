package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.BoardType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// deleted_posts는 BaseTimeEntity 없이 직접 시간 컬럼 관리
@Entity
@Table(name = "deleted_posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class DeletedPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long originalPostId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BoardType boardType;

    @Column(nullable = false)
    private Long authorId;

    @Column(nullable = false, length = 300)
    private String title;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String content;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String contentSanitized;

    @Column(nullable = false)
    private Long deletedBy;

    @Column(length = 500)
    private String deleteReason;

    @Column(nullable = false)
    private LocalDateTime deletedAt;

    @Column(nullable = false)
    private LocalDateTime originalCreatedAt;
}
