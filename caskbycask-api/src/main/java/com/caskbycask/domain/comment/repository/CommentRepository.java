package com.caskbycask.domain.comment.repository;

import com.caskbycask.domain.comment.entity.CommunityComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<CommunityComment, Long> {

    @Query(value = """
            SELECT c FROM CommunityComment c
            JOIN FETCH c.user
            WHERE c.spirit.id = :spiritId
              AND c.parent IS NULL
              AND c.isHidden = false
            """,
            countQuery = """
            SELECT COUNT(c) FROM CommunityComment c
            WHERE c.spirit.id = :spiritId
              AND c.parent IS NULL
              AND c.isHidden = false
            """)
    Page<CommunityComment> findParentComments(
            @Param("spiritId") Long spiritId, Pageable pageable);

    @Query("""
            SELECT c FROM CommunityComment c
            JOIN FETCH c.user
            WHERE c.parent.id IN :parentIds
              AND c.isHidden = false
            ORDER BY c.createdAt ASC
            """)
    List<CommunityComment> findChildrenByParentIds(
            @Param("parentIds") List<Long> parentIds);

    Optional<CommunityComment> findByIdAndSpiritId(Long id, Long spiritId);

    @Query(value = """
            SELECT c FROM CommunityComment c
            JOIN FETCH c.user
            JOIN FETCH c.spirit
            WHERE (:isHidden IS NULL OR c.isHidden = :isHidden)
            """,
            countQuery = """
            SELECT COUNT(c) FROM CommunityComment c
            WHERE (:isHidden IS NULL OR c.isHidden = :isHidden)
            """)
    Page<CommunityComment> findForAdmin(@Param("isHidden") Boolean isHidden, Pageable pageable);
}
