package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "post_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // nullable: 게시글 저장 전 업로드된 고아 이미지 허용
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(nullable = false, length = 255)
    private String originalFileName;

    // [보안] UUID 랜덤화로 파일명 예측 방지
    @Column(nullable = false, length = 255)
    private String savedFileName;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false, length = 100)
    private String mimeType;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    // 파일 실제 저장 경로 (basePath 하위, 예: "posts/202506"). 서빙·삭제 시 경로 복원용.
    @Column(nullable = false, length = 200)
    private String subPath;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isUsed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    private User uploadedBy;

    public void linkPost(Post post) {
        this.post = post;
        this.isUsed = true;
    }
}
