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

    /**
     * 주류 상세의 "이 주류를 언급한 글" — 게시판을 가리지 않는다.
     * <p>
     * 위의 사진 전용 조회와 달리 게시판 조건이 없다. 일반 글 목록 조회
     * ({@code PostQueryRepository.findPosts})는 boardType 이 없으면 NOTICE+FREE 화이트리스트로
     * 좁히므로 이미지 갤러리 글이 빠지는데, 주류 태그는 오히려 그쪽에 가장 많이 붙어 있다.
     * <p>
     * 성인 전용 글은 sitemap 이 이미 제외하고 있어 색인 대상과 어긋나지 않도록 여기서도 뺀다.
     */
    @Query(value = """
        select t.post from PostSpiritTag t
        where t.spirit.id = :spiritId
          and t.post.status <> com.caskbycask.domain.community.entity.enums.PostStatus.DELETED
          and t.post.isHidden = false
          and t.post.adultOnly = false
        order by t.post.id desc
        """,
        countQuery = """
        select count(t) from PostSpiritTag t
        where t.spirit.id = :spiritId
          and t.post.status <> com.caskbycask.domain.community.entity.enums.PostStatus.DELETED
          and t.post.isHidden = false
          and t.post.adultOnly = false
        """)
    Page<Post> findPublicPostsBySpiritId(@Param("spiritId") Long spiritId, Pageable pageable);
}
