package com.caskbycask.domain.photocard.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

/**
 * 포토카드 임시저장 — 편집 중인 카드를 잠시 맡아 두는 곳.
 * <p>
 * 커뮤니티 글쓰기의 {@code ContentDraft} 와 같은 자리지만 담는 것이 다르다. 배치·촬영 정보는
 * {@code contentJson} 한 덩어리로 두고(서버는 내용을 해석하지 않는다), 편집 중인 원본 사진은
 * 파일로 따로 둔다 — 사진이 없으면 이어서 편집한다는 말 자체가 성립하지 않는다.
 * <p>
 * 남의 사진첩을 오래 들고 있지 않도록 {@code expiresAt} 을 두고 배치가 지운다(보관 2주).
 */
@Entity
@Table(name = "photo_card_drafts",
        indexes = {
                @Index(name = "idx_photo_card_drafts_user", columnList = "user_id, updated_at"),
                @Index(name = "idx_photo_card_drafts_expires", columnList = "expires_at")
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("포토카드 임시저장")
public class PhotoCardDraft extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("작성자(users.id)")
    private User user;

    @Column(length = 100)
    @Comment("임시저장 이름(목록 표시용)")
    private String name;

    @Column(name = "content_json", nullable = false, columnDefinition = "MEDIUMTEXT")
    @Comment("편집 내용(JSON)")
    private String contentJson;

    @Column(name = "thumbnail_data_uri", columnDefinition = "MEDIUMTEXT")
    @Comment("목록 미리보기(data URI)")
    private String thumbnailDataUri;

    @Column(name = "photo_saved_file_name", length = 255)
    @Comment("사진 저장 파일명")
    private String photoSavedFileName;

    @Column(name = "photo_sub_path", length = 200)
    @Comment("사진 저장 하위 경로")
    private String photoSubPath;

    @Column(name = "photo_mime_type", length = 100)
    @Comment("사진 MIME 타입")
    private String photoMimeType;

    @Column(name = "expires_at", nullable = false)
    @Comment("보관 만료 일시")
    private LocalDateTime expiresAt;

    /** 내용 갱신 — 저장할 때마다 보관 기한도 다시 센다(방금 손댄 작업이 먼저 사라지지 않게). */
    public void update(String name, String contentJson, String thumbnailDataUri, LocalDateTime expiresAt) {
        this.name = name;
        this.contentJson = contentJson;
        if (thumbnailDataUri != null) {
            this.thumbnailDataUri = thumbnailDataUri;
        }
        this.expiresAt = expiresAt;
    }

    /** 사진 교체. 이전 파일 삭제는 호출한 쪽이 커밋 후에 한다. */
    public void replacePhoto(String savedFileName, String subPath, String mimeType) {
        this.photoSavedFileName = savedFileName;
        this.photoSubPath = subPath;
        this.photoMimeType = mimeType;
    }

    public boolean hasPhoto() {
        return photoSavedFileName != null && photoSubPath != null;
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }
}
