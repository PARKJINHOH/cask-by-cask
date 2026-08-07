package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsArticle;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleStatus;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleType;
import com.caskbycask.domain.ainews.entity.enums.AiNewsCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AiNewsArticleRepository extends JpaRepository<AiNewsArticle, Long> {

    @Query("""
            select a from AiNewsArticle a
            where (:status is null or a.status = :status)
              and (:excludedStatus is null or a.status <> :excludedStatus)
              and (:articleType is null or a.articleType = :articleType)
              and (:category is null or a.category = :category)
              and (:fromAt is null or a.createdAt >= :fromAt)
              and (:toAt is null or a.createdAt < :toAt)
            order by a.createdAt desc
            """)
    Page<AiNewsArticle> search(@Param("status") AiNewsArticleStatus status,
                               @Param("excludedStatus") AiNewsArticleStatus excludedStatus,
                               @Param("articleType") AiNewsArticleType articleType,
                               @Param("category") AiNewsCategory category,
                               @Param("fromAt") LocalDateTime fromAt,
                               @Param("toAt") LocalDateTime toAt,
                               Pageable pageable);

    @EntityGraph(attributePaths = {"sources", "topic"})
    @Query("select a from AiNewsArticle a where a.id = :id")
    Optional<AiNewsArticle> findDetailById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AiNewsArticle a where a.id = :id")
    Optional<AiNewsArticle> findForPublishById(@Param("id") Long id);

    Optional<AiNewsArticle> findByDedupeKey(String dedupeKey);
    Optional<AiNewsArticle> findFirstByCanonicalUrlHash(String canonicalUrlHash);
    Optional<AiNewsArticle> findFirstByArticleTypeAndSourcesCanonicalUrlInOrderByCreatedAtAsc(
            AiNewsArticleType articleType, Collection<String> canonicalUrls);
    Optional<AiNewsArticle> findByPostId(Long postId);

    @Query("""
            select source.canonicalUrl
            from AiNewsArticle article join article.sources source
            where article.postId = :postId and article.status = :status
            order by source.id asc
            """)
    List<String> findSourceUrlsByPostIdAndStatus(@Param("postId") Long postId,
                                                  @Param("status") AiNewsArticleStatus status);

    Optional<AiNewsArticle> findFirstByArticleTypeAndSemanticFingerprint(AiNewsArticleType articleType,
                                                                          String semanticFingerprint);

    long countByStatus(AiNewsArticleStatus status);

    boolean existsByTopicId(Long topicId);

    Optional<AiNewsArticle> findFirstByStatusOrderByRewriteRequestedAtAsc(AiNewsArticleStatus status);

    @Query("select a.id from AiNewsArticle a where a.status = :status " +
           "and a.scheduledAt is not null and a.scheduledAt <= :now order by a.scheduledAt asc")
    List<Long> findDueScheduledIds(@Param("status") AiNewsArticleStatus status,
                                   @Param("now") LocalDateTime now,
                                   Pageable pageable);

    boolean existsByContentContainingAndStatusIn(String value, Collection<AiNewsArticleStatus> statuses);

    @Query("select count(a) from AiNewsArticle a where a.articleType = :type and a.publishedAt >= :from")
    long countSuccessfulPublicationsSince(@Param("type") AiNewsArticleType type,
                                          @Param("from") LocalDateTime from);

    @Query("select max(a.publishedAt) from AiNewsArticle a where a.articleType = :type")
    LocalDateTime findLastSuccessfulPublishedAt(@Param("type") AiNewsArticleType type);

    List<AiNewsArticle> findByArticleTypeAndStatusInOrderByCreatedAtAsc(
            AiNewsArticleType articleType, Collection<AiNewsArticleStatus> statuses);
}
