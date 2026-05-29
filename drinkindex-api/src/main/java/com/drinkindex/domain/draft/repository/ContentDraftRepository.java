package com.drinkindex.domain.draft.repository;

import com.drinkindex.domain.draft.entity.ContentDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContentDraftRepository extends JpaRepository<ContentDraft, Long> {

    // 작성 화면(draftKey)별 임시저장 목록 (최근 저장 순)
    List<ContentDraft> findByUserIdAndDraftKeyOrderByUpdatedAtDesc(Long userId, String draftKey);

    // draftKey 당 개수 (10개 제한 체크)
    long countByUserIdAndDraftKey(Long userId, String draftKey);

    // 단건 조회 + 소유 검증
    Optional<ContentDraft> findByIdAndUserId(Long id, Long userId);
}
