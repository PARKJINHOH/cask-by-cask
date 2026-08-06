package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.dto.PostSort;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostReport;
import com.caskbycask.domain.community.entity.QPost;
import com.caskbycask.domain.community.entity.QPostComment;
import com.caskbycask.domain.community.entity.QPostReport;
import com.querydsl.jpa.JPAExpressions;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import com.caskbycask.domain.community.entity.enums.ReportStatus;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

@RequiredArgsConstructor
public class PostQueryRepositoryImpl implements PostQueryRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Post> findPosts(BoardType boardType, Long prefixId, String keyword,
                                PostSort sort, Long authorId, Long commentAuthorId,
                                Long distilleryTagId, List<Long> excludeAuthorIds,
                                Pageable pageable) {
        QPost post = QPost.post;

        BooleanBuilder predicate = new BooleanBuilder();
        if (excludeAuthorIds != null && !excludeAuthorIds.isEmpty()) {
            predicate.and(post.author.id.notIn(excludeAuthorIds));
        }
        if (boardType != null) {
            predicate.and(post.boardType.eq(boardType));
        } else {
            // "전체" 게시판: NOTICE + FREE 통합 조회.
            // PHOTO(이미지 갤러리)는 목록이 이미지형 그리드라 글 목록에 섞이면 안 된다.
            // 화이트리스트를 유지할 것 — 블랙리스트(ne(PHOTO))로 바꾸면 게시판을 추가할 때마다 샌다.
            predicate.and(post.boardType.in(BoardType.NOTICE, BoardType.FREE));
        }
        predicate.and(post.status.ne(PostStatus.DELETED));
        predicate.and(post.isHidden.isFalse()); // 숨김 처리된 게시글은 공개 목록에서 제외

        if (prefixId != null) {
            predicate.and(post.prefix.id.eq(prefixId));
        }
        if (StringUtils.hasText(keyword)) {
            // [버그수정] contentSanitized 는 @Lob(LONGTEXT) 컬럼 — containsIgnoreCase()가
            // 생성하는 lower() 함수를 CLOB 타입에 적용하면 Hibernate 6에서 쿼리 변환 오류 발생.
            // utf8mb4_unicode_ci collation은 대소문자 구분이 없으므로 lower() 없는 contains()로 대체.
            predicate.and(
                post.title.containsIgnoreCase(keyword)
                    .or(post.contentSanitized.contains(keyword))
            );
        }
        if (authorId != null) {
            predicate.and(post.author.id.eq(authorId));
            predicate.and(post.isAnonymous.isFalse());
        }
        // [패치 9] 소식 게시판 증류소 태그 필터
        if (distilleryTagId != null) {
            predicate.and(post.distilleryTag.id.eq(distilleryTagId));
        }
        if (commentAuthorId != null) {
            QPostComment comment = QPostComment.postComment;
            predicate.and(JPAExpressions.selectOne()
                    .from(comment)
                    .where(comment.post.id.eq(post.id)
                            .and(comment.author.id.eq(commentAuthorId))
                            .and(comment.deletedAt.isNull()))
                    .exists());
        }

        OrderSpecifier<?> primary = resolveOrder(sort, post);

        List<Post> posts = queryFactory
                .selectFrom(post)
                .leftJoin(post.prefix).fetchJoin()
                .leftJoin(post.author).fetchJoin()
                .leftJoin(post.distilleryTag).fetchJoin() // [패치 9] 증류소 태그 N+1 방지
                .where(predicate)
                // 게시판 공지(고정글) 우선 → 선택 정렬 → 최신순. "전체" 합본에서도 동일 적용.
                .orderBy(post.isPinned.desc(), primary, post.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(post.count())
                .from(post)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(posts, pageable, total != null ? total : 0L);
    }

    @Override
    public Page<Post> findBestPosts(BoardType boardType, int minLikeCount,
                                    List<Long> excludeAuthorIds, Pageable pageable) {
        QPost post = QPost.post;

        BooleanBuilder predicate = new BooleanBuilder();
        predicate.and(post.boardType.eq(boardType));
        predicate.and(post.status.eq(PostStatus.ACTIVE));
        predicate.and(post.isHidden.isFalse()); // 숨김 처리된 게시글 제외
        predicate.and(post.likeCount.goe(minLikeCount));
        if (excludeAuthorIds != null && !excludeAuthorIds.isEmpty()) {
            predicate.and(post.author.id.notIn(excludeAuthorIds));
        }

        List<Post> posts = queryFactory
                .selectFrom(post)
                .leftJoin(post.prefix).fetchJoin()
                .leftJoin(post.author).fetchJoin()
                .where(predicate)
                .orderBy(post.likeCount.desc(), post.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(post.count())
                .from(post)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(posts, pageable, total != null ? total : 0L);
    }

    @Override
    public Page<PostReport> findReports(ReportStatus status, Pageable pageable) {
        QPostReport report = QPostReport.postReport;

        BooleanBuilder predicate = new BooleanBuilder();
        if (status != null) {
            predicate.and(report.status.eq(status));
        }

        List<PostReport> reports = queryFactory
                .selectFrom(report)
                .leftJoin(report.post).fetchJoin()
                .leftJoin(report.comment).fetchJoin()
                .leftJoin(report.reporter).fetchJoin()
                .where(predicate)
                .orderBy(report.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(report.count())
                .from(report)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(reports, pageable, total != null ? total : 0L);
    }

    private OrderSpecifier<?> resolveOrder(PostSort sort, QPost post) {
        if (sort == null) return post.createdAt.desc();
        return switch (sort) {
            case BEST -> post.likeCount.desc();
            case VIEW -> post.viewCount.desc();
            default   -> post.createdAt.desc();
        };
    }

}
