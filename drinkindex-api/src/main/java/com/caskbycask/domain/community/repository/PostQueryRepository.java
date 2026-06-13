package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.dto.PostSort;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostReport;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.entity.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PostQueryRepository {

    // [패치 9] distilleryTagId 추가 — 소식 게시판 증류소 태그 필터
    // excludeAuthorIds: 내가 차단한 작성자(글 숨김). null/empty 면 미적용
    Page<Post> findPosts(BoardType boardType, Long prefixId, String keyword, PostSort sort,
                         Long authorId, Long commentAuthorId, Long distilleryTagId,
                         List<Long> excludeAuthorIds, Pageable pageable);

    Page<Post> findBestPosts(BoardType boardType, int minLikeCount,
                             List<Long> excludeAuthorIds, Pageable pageable);

    Page<PostReport> findReports(ReportStatus status, Pageable pageable);
}
