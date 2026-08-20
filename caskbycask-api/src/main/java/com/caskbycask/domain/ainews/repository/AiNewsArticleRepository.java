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

    long countByStatus(AiNewsArticleStatus status);

    /**
     * 목록 한 페이지분 원고의 출처 도메인을 한 번에 읽는다.
     * 행마다 {@code article.getSources()} 를 건드리면 페이지 크기만큼 쿼리가 늘어난다(N+1).
     */
    @Query("""
            select s.article.id as articleId, s.domain as domain
            from AiNewsArticleSource s
            where s.article.id in :articleIds
            order by s.id asc
            """)
    List<ArticleSourceDomain> findSourceDomainsByArticleIdIn(@Param("articleIds") Collection<Long> articleIds);

    interface ArticleSourceDomain {
        Long getArticleId();
        String getDomain();
    }

    boolean existsByTopicId(Long topicId);

    @Query("select a.id from AiNewsArticle a where a.status = :status " +
           "and a.scheduledAt is not null and a.scheduledAt <= :now order by a.scheduledAt asc")
    List<Long> findDueScheduledIds(@Param("status") AiNewsArticleStatus status,
                                   @Param("now") LocalDateTime now,
                                   Pageable pageable);

    boolean existsByContentContainingAndStatusIn(String value, Collection<AiNewsArticleStatus> statuses);

    /**
     * 오늘 만들어진 원고 수. 일일 한도는 발행이 아니라 <b>생성</b>을 기준으로 센다 —
     * 발행은 관리자가 며칠 뒤에 할 수도 있어서 발행 기준으로는 수집을 조절할 수 없다.
     */
    @Query("select count(a) from AiNewsArticle a where a.articleType = :type and a.createdAt >= :from")
    long countCreatedSince(@Param("type") AiNewsArticleType type, @Param("from") LocalDateTime from);
}
