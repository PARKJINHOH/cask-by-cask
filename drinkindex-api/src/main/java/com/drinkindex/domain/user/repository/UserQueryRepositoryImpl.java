package com.drinkindex.domain.user.repository;

import com.drinkindex.domain.producer.entity.QProducer;
import com.drinkindex.domain.user.dto.UserSearchCondition;
import com.drinkindex.domain.user.entity.QUser;
import com.drinkindex.domain.user.entity.User;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

@RequiredArgsConstructor
public class UserQueryRepositoryImpl implements UserQueryRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<User> searchUsers(UserSearchCondition condition, Pageable pageable) {
        QUser user = QUser.user;
        QProducer producer = QProducer.producer;

        BooleanBuilder predicate = buildPredicate(condition, user);

        List<User> users = queryFactory
                .selectFrom(user)
                .leftJoin(user.producer, producer).fetchJoin()
                .where(predicate)
                .orderBy(user.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(user.count())
                .from(user)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(users, pageable, total != null ? total : 0L);
    }

    private BooleanBuilder buildPredicate(UserSearchCondition cond, QUser user) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(cond.keyword())) {
            builder.and(
                    user.email.containsIgnoreCase(cond.keyword())
                            .or(user.nickname.containsIgnoreCase(cond.keyword()))
            );
        }
        if (cond.role() != null) {
            builder.and(user.role.eq(cond.role()));
        }
        if (cond.isActive() != null) {
            builder.and(user.isActive.eq(cond.isActive()));
        }

        return builder;
    }
}
