package com.drinkindex.domain.community.entity;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "post_videos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostVideo extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // nullable: 게시글 저장 전 업로드된 고아 동영상 허용
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(nullable = false, length = 255)
    private String originalFileName;

    @Column(nullable = false, length = 255)
    private String savedFileName;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false, length = 100)
    private String mimeType;

    @Column(nullable = false, length = 500)
    private String videoUrl;

    // 파일 실제 저장 경로 (basePath 하위, 스트리밍 서빙 시 경로 복원용)
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
        this.isUsed = (post != null);
    }
}
