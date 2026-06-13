package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "price_report_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PriceReportImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 업로드 직후 null — 가격 등록 시 연결됨 (notice 패턴 동일)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "price_report_id")
    private PriceReport priceReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    private User uploadedBy;

    @Column(length = 255)
    private String originalFileName;

    @Column(nullable = false, length = 255)
    private String savedFileName;

    @Column(nullable = false, length = 100)
    private String subPath;

    @Column(nullable = false, length = 50)
    private String mimeType;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    private Integer sortOrder = 0;

    // 사용자 화면 공개 여부. 관리자는 항상 열람 가능.
    @Builder.Default
    @Column(nullable = false)
    private Boolean isPublic = true;

    public void linkToPriceReport(PriceReport priceReport, int sortOrder, boolean isPublic) {
        this.priceReport = priceReport;
        this.sortOrder = sortOrder;
        this.isPublic = isPublic;
    }

    public void unlinkFromPriceReport() {
        this.priceReport = null;
    }

    public void togglePublic(boolean isPublic) {
        this.isPublic = isPublic;
    }
}
