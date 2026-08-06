package com.caskbycask.domain.photocard.repository;

import com.caskbycask.domain.photocard.entity.PhotoCardTemplate;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardModerationStatus;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PhotoCardTemplateRepository extends JpaRepository<PhotoCardTemplate, Long> {

    /**
     * 소유자 조건을 쿼리에 강제한다.
     * 서비스에서 조회 후 비교하는 방식은 조건을 빠뜨리면 그대로 남의 데이터가 나간다.
     */
    @Query("""
        select t from PhotoCardTemplate t
        left join fetch t.owner
        where t.id = :id
          and t.templateType = com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType.USER
          and t.owner.id = :ownerId
        """)
    Optional<PhotoCardTemplate> findOwnedById(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("""
        select t from PhotoCardTemplate t
        left join fetch t.owner
        where t.id = :id
        """)
    Optional<PhotoCardTemplate> findByIdWithOwner(@Param("id") Long id);

    /** 내 템플릿 목록 */
    @Query("""
        select t from PhotoCardTemplate t
        where t.templateType = com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType.USER
          and t.owner.id = :ownerId
        order by t.updatedAt desc, t.id desc
        """)
    List<PhotoCardTemplate> findAllOwnedBy(@Param("ownerId") Long ownerId);

    long countByTemplateTypeAndOwnerId(PhotoCardTemplateType templateType, Long ownerId);

    /** 공식 템플릿 — 사용자 화면용(숨김 제외) */
    List<PhotoCardTemplate> findByTemplateTypeAndModerationStatusOrderByDisplayOrderAscIdAsc(
            PhotoCardTemplateType templateType, PhotoCardModerationStatus moderationStatus);

    /** 관리자 목록 — 숨김 포함 전체 */
    List<PhotoCardTemplate> findByTemplateTypeOrderByDisplayOrderAscIdAsc(PhotoCardTemplateType templateType);

    /** 다른 사용자가 공개한 템플릿 (본인 것 제외) */
    @Query("""
        select t from PhotoCardTemplate t
        left join fetch t.owner
        where t.templateType = com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType.USER
          and t.isPublic = true
          and t.moderationStatus = com.caskbycask.domain.photocard.entity.enums.PhotoCardModerationStatus.VISIBLE
          and (:excludeUserId is null or t.owner.id <> :excludeUserId)
        order by t.useCount desc, t.updatedAt desc, t.id desc
        """)
    List<PhotoCardTemplate> findPublicUserTemplates(@Param("excludeUserId") Long excludeUserId);

    /** 관리자 — 공개된 사용자 템플릿 검토 목록 */
    @Query("""
        select t from PhotoCardTemplate t
        left join fetch t.owner
        where t.templateType = com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType.USER
          and t.isPublic = true
        order by t.updatedAt desc, t.id desc
        """)
    Page<PhotoCardTemplate> findPublicUserTemplatesForAdmin(Pageable pageable);
}
