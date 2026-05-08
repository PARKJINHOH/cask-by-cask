package com.drinkindex.domain.notice.entity;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "notice_image",
        indexes = {
                @Index(name = "idx_notice_image_notice_id", columnList = "notice_id"),
                @Index(name = "idx_notice_image_uploaded_by_id", columnList = "uploaded_by_id"),
                @Index(name = "idx_notice_image_is_used", columnList = "is_used")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class NoticeImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // notice_id nullable: 임시저장 중 업로드된 고아 이미지 허용.
    // isUsed=false로 관리하다가 배치로 정리.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notice_id")
    private Notice notice;

    // 업로드 원본 파일명. DB에만 보존, 저장 경로에는 사용 안 함.
    @Column(nullable = false, length = 255)
    private String originalFileName;

    // [보안] 파일명 랜덤화: UUID 기반. 원본명 노출 및 경로 추측 차단.
    @Column(nullable = false, length = 255)
    private String savedFileName;

    // 파일 저장 경로 (예: notices/202506). 삭제 시 storage 위치 특정에 사용.
    @Column(nullable = false, length = 100)
    private String subPath;

    @Column(nullable = false)
    private Long fileSize;

    // [보안] Magic Bytes 검사로 확인된 실제 MIME 타입 저장.
    @Column(nullable = false, length = 100)
    private String mimeType;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isUsed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    private User uploadedBy;

    public void linkToNotice(Notice notice) {
        this.notice = notice;
        this.isUsed = true;
    }

    public void markAsUsed()   { this.isUsed = true; }
    public void markAsUnused() { this.isUsed = false; }
}
