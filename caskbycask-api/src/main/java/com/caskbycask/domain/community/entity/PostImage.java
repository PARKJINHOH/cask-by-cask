package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "post_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    // nullable: 게시글 저장 전 업로드된 고아 이미지 허용
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @Comment("게시글(posts.id)")
    private Post post;

    @Column(nullable = false, length = 255)
    @Comment("원본 파일명")
    private String originalFileName;

    // [보안] UUID 랜덤화로 파일명 예측 방지
    @Column(nullable = false, length = 255)
    @Comment("저장 파일명")
    private String savedFileName;

    @Column(nullable = false)
    @Comment("파일 크기(byte)")
    private Long fileSize;

    @Column(nullable = false, length = 100)
    @Comment("MIME 타입")
    private String mimeType;

    @Column(nullable = false, length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    // 파일 실제 저장 경로 (basePath 하위, 예: "posts/202506"). 서빙·삭제 시 경로 복원용.
    @Column(nullable = false, length = 200)
    @Comment("저장 하위 경로")
    private String subPath;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 중 여부")
    private Boolean isUsed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    @Comment("업로더(users.id)")
    private User uploadedBy;

    public void linkPost(Post post) {
        this.post = post;
        this.isUsed = true;
    }
}
