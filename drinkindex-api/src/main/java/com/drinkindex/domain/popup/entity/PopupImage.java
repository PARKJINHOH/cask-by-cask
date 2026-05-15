package com.drinkindex.domain.popup.entity;

import com.drinkindex.domain.popup.entity.enums.PopupImageType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "popup_images",
        indexes = {
                @Index(name = "idx_popup_image_popup_id", columnList = "popup_id"),
                @Index(name = "idx_popup_image_is_used", columnList = "is_used"),
                @Index(name = "idx_popup_image_uploaded_by_id", columnList = "uploaded_by_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PopupImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // nullable: 업로드 직후 팝업 미저장 상태 허용 (고아 이미지)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popup_id")
    private Popup popup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PopupImageType imageType;

    // [보안] 원본 파일명. DB에만 보존, 저장 경로 미사용.
    @Column(nullable = false, length = 255)
    private String originalFileName;

    // [보안] UUID 랜덤화. 원본명 노출 및 경로 추측 차단.
    @Column(nullable = false, length = 255)
    private String savedFileName;

    @Column(nullable = false, length = 100)
    private String subPath;

    @Column(nullable = false)
    private Long fileSize;

    // [보안] Magic Bytes 검사로 확인된 실제 MIME 타입.
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

    public void linkToPopup(Popup popup) {
        this.popup = popup;
        this.isUsed = true;
    }

    public void markAsUsed()   { this.isUsed = true; }
    public void markAsUnused() { this.isUsed = false; }
}
