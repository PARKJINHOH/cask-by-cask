package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SocialPublicationRepository extends JpaRepository<SocialPublication, Long> {

    @Query("""
            select p.id from SocialPublication p
            where p.status in :statuses
              and (p.nextAttemptAt is null or p.nextAttemptAt <= :now)
            order by p.id
            """)
    List<Long> findProcessableIds(@Param("statuses") Collection<SocialPublicationStatus> statuses,
                                  @Param("now") LocalDateTime now,
                                  Pageable pageable);

    @Query("""
            select p.id from SocialPublication p
            where p.status in :statuses
              and p.updatedAt < :staleBefore
            order by p.id
            """)
    List<Long> findStaleIds(@Param("statuses") Collection<SocialPublicationStatus> statuses,
                            @Param("staleBefore") LocalDateTime staleBefore,
                            Pageable pageable);

    @Query("""
            select p.id from SocialPublication p
            where p.status = :status
            order by p.publishedAt desc, p.id desc
            """)
    List<Long> findIdsByStatus(@Param("status") SocialPublicationStatus status, Pageable pageable);

    List<SocialPublication> findByBundleIdOrderByPlatformAsc(Long bundleId);
    @EntityGraph(attributePaths = {"bundle"})
    List<SocialPublication> findByBundleIdInOrderByPlatformAsc(Collection<Long> bundleIds);
    Optional<SocialPublication> findByIdAndBundleRequestedById(Long id, Long userId);

    @EntityGraph(attributePaths = {"bundle"})
    Page<SocialPublication> findByBundleRequestedByIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Query("""
            select p from SocialPublication p
            join fetch p.bundle b
            left join fetch b.thumbnailTemplate
            left join fetch b.requestedBy
            where p.id = :id
            """)
    Optional<SocialPublication> findWithBundleById(@Param("id") Long id);

    @Query(value = """
            select p from SocialPublication p
            join fetch p.bundle b
            where (:platform is null or p.platform = :platform)
              and (:status is null or p.status = :status)
            """,
            countQuery = """
            select count(p) from SocialPublication p
            where (:platform is null or p.platform = :platform)
              and (:status is null or p.status = :status)
            """)
    Page<SocialPublication> findForAdmin(@Param("platform") SocialPlatform platform,
                                         @Param("status") SocialPublicationStatus status,
                                         Pageable pageable);

    @EntityGraph(attributePaths = {"bundle"})
    Page<SocialPublication> findByStatusOrderByPublishedAtDesc(
            SocialPublicationStatus status, Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update SocialPublication p
            set p.containerId = null,
                p.externalMediaId = null,
                p.permalink = null,
                p.lastErrorCode = null,
                p.lastErrorMessage = null
            where p.platform = :platform
            """)
    int eraseProviderDataByPlatform(@Param("platform") SocialPlatform platform);
}
