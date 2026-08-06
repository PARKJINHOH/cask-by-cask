package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostSpiritTag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PostSpiritTagRepository extends JpaRepository<PostSpiritTag, Long> {

    /** 목록 화면용 일괄 조회 — 게시글마다 따로 조회하면 N+1 이 된다. */
    @Query("""
        select t from PostSpiritTag t
        join fetch t.spirit s
        where t.post.id in :postIds
        order by t.post.id asc, t.sortOrder asc, t.id asc
        """)
    List<PostSpiritTag> findByPostIdInWithSpirit(@Param("postIds") Collection<Long> postIds);

    @Query("""
        select t from PostSpiritTag t
        join fetch t.spirit s
        where t.post.id = :postId
        order by t.sortOrder asc, t.id asc
        """)
    List<PostSpiritTag> findByPostIdWithSpirit(@Param("postId") Long postId);

    void deleteAllByPostId(Long postId);

    /**
     * 주류 상세의 "이 술의 사진" — 공개 상태인 이미지 갤러리 글만 최신순으로.
     * <p>
     * 숨김·삭제 글이 새지 않도록 조건을 쿼리에 못 박는다.
     * count 쿼리는 자동 유도가 되지 않아 직접 지정한다.
     */
    @Query(value = """
        select t.post from PostSpiritTag t
        where t.spirit.id = :spiritId
          and t.post.boardType = com.caskbycask.domain.community.entity.enums.BoardType.PHOTO
          and t.post.status <> com.caskbycask.domain.community.entity.enums.PostStatus.DELETED
          and t.post.isHidden = false
        order by t.post.id desc
        """,
        countQuery = """
        select count(t) from PostSpiritTag t
        where t.spirit.id = :spiritId
          and t.post.boardType = com.caskbycask.domain.community.entity.enums.BoardType.PHOTO
          and t.post.status <> com.caskbycask.domain.community.entity.enums.PostStatus.DELETED
          and t.post.isHidden = false
        """)
    Page<Post> findPublicPhotoPostsBySpiritId(@Param("spiritId") Long spiritId, Pageable pageable);
}
