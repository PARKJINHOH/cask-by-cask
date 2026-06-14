package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PriceReportImageRepository extends JpaRepository<PriceReportImage, Long> {

    List<PriceReportImage> findByPriceReportIdOrderBySortOrder(Long priceReportId);

    // 관리자 목록 N+1 방지 — 페이지 내 여러 제보의 이미지를 한 번에 조회 후 메모리 그룹핑.
    List<PriceReportImage> findByPriceReportIdInOrderByPriceReportIdAscSortOrderAsc(List<Long> priceReportIds);

    // 임시 이미지 조회 — 본인 업로드 + 미연결 상태 검증
    @Query("""
            SELECT i FROM PriceReportImage i
            WHERE i.id IN :ids
            AND i.uploadedBy.id = :uploadedById
            AND i.priceReport IS NULL
            """)
    List<PriceReportImage> findTempImagesByUploader(
            @Param("ids") List<Long> ids,
            @Param("uploadedById") Long uploadedById);

    // 연결된 이미지 공개 여부 필터
    List<PriceReportImage> findByPriceReportIdAndIsPublicTrueOrderBySortOrder(Long priceReportId);

    // 오래된 미연결 임시 이미지 정리용 (배치)
    @Query("""
            SELECT i FROM PriceReportImage i
            WHERE i.priceReport IS NULL
            AND i.createdAt < :cutoff
            """)
    List<PriceReportImage> findOrphanedBefore(@Param("cutoff") LocalDateTime cutoff);
}
