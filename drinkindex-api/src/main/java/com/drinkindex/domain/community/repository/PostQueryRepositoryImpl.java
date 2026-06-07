package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.dto.PostSort;
import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.PostReport;
import com.drinkindex.domain.community.entity.QPost;
import com.drinkindex.domain.community.entity.QPostComment;
import com.drinkindex.domain.community.entity.QPostReport;
import com.querydsl.jpa.JPAExpressions;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.entity.enums.PostStatus;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
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
            // "전체" 게시판: NOTICE + FREE 통합 조회
            predicate.and(post.boardType.in(BoardType.NOTICE, BoardType.FREE));
        }
        predicate.and(post.status.ne(PostStatus.DELETED));

        if (prefixId != null) {
            predicate.and(post.prefix.id.eq(prefixId));
        }
        if (StringUtils.hasText(keyword)) {
            predicate.and(
                post.title.containsIgnoreCase(keyword)
                    .or(post.contentSanitized.containsIgnoreCase(keyword))
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
