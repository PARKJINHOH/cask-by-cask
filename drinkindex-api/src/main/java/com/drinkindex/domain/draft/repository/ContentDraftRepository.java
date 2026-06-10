package com.drinkindex.domain.draft.repository;

import com.drinkindex.domain.draft.entity.ContentDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ContentDraftRepository extends JpaRepository<ContentDraft, Long> {

    // 작성 화면(draftKey)별 임시저장 목록 (최근 저장 순)
    List<ContentDraft> findByUserIdAndDraftKeyOrderByUpdatedAtDesc(Long userId, String draftKey);

    // draftKey 당 개수 (10개 제한 체크)
    long countByUserIdAndDraftKey(Long userId, String draftKey);

    // 단건 조회 + 소유 검증
    Optional<ContentDraft> findByIdAndUserId(Long id, Long userId);

    // 미디어 고아 정리 — 임시저장 본문에 해당 파일명이 박혀 있는지 (사용 중 여부 교차검증)
    @Query("SELECT COUNT(d) > 0 FROM ContentDraft d WHERE d.content LIKE CONCAT('%', :fragment, '%')")
    boolean existsByContentContaining(@Param("fragment") String fragment);
}
