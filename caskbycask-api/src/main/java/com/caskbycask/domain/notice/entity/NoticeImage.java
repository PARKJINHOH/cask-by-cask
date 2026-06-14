package com.caskbycask.domain.notice.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("공지 이미지")
public class NoticeImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    // notice_id nullable: 임시저장 중 업로드된 고아 이미지 허용.
    // isUsed=false로 관리하다가 배치로 정리.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notice_id")
    @Comment("공지(notice.id)")
    private Notice notice;

    // 업로드 원본 파일명. DB에만 보존, 저장 경로에는 사용 안 함.
    @Column(nullable = false, length = 255)
    @Comment("원본 파일명")
    private String originalFileName;

    // [보안] 파일명 랜덤화: UUID 기반. 원본명 노출 및 경로 추측 차단.
    @Column(nullable = false, length = 255)
    @Comment("저장 파일명")
    private String savedFileName;

    // 파일 저장 경로 (예: notices/202506). 삭제 시 storage 위치 특정에 사용.
    @Column(nullable = false, length = 100)
    @Comment("저장 하위 경로")
    private String subPath;

    @Column(nullable = false)
    @Comment("파일 크기(byte)")
    private Long fileSize;

    // [보안] Magic Bytes 검사로 확인된 실제 MIME 타입 저장.
    @Column(nullable = false, length = 100)
    @Comment("MIME 타입")
    private String mimeType;

    @Column(nullable = false, length = 500)
    @Comment("이미지 URL")
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 중 여부")
    private Boolean isUsed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    @Comment("업로더(users.id)")
    private User uploadedBy;

    public void linkToNotice(Notice notice) {
        this.notice = notice;
        this.isUsed = true;
    }

    public void markAsUsed()   { this.isUsed = true; }
    public void markAsUnused() { this.isUsed = false; }
}
