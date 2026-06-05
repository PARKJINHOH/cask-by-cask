package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.dto.PostSort;
import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.PostReport;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PostQueryRepository {

    // [패치 9] distilleryTagId 추가 — 소식 게시판 증류소 태그 필터
    Page<Post> findPosts(BoardType boardType, Long prefixId, String keyword, PostSort sort,
                         Long authorId, Long commentAuthorId, Long distilleryTagId, Pageable pageable);

    Page<Post> findBestPosts(BoardType boardType, int minLikeCount, Pageable pageable);

    Page<PostReport> findReports(ReportStatus status, Pageable pageable);
}
