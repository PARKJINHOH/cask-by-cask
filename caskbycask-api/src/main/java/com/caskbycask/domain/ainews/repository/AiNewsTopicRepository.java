package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsTopic;
import com.caskbycask.domain.ainews.entity.enums.AiNewsCategory;
import com.caskbycask.domain.ainews.entity.enums.AiNewsTopicStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AiNewsTopicRepository extends JpaRepository<AiNewsTopic, Long> {

    /**
     * 관리자 정보 주제 목록. keyword 는 제목·중복 키·동의어를 함께 훑는다.
     * 소문자로 정규화하고 LIKE 와일드카드를 escape 문자 '!' 로 이스케이프해서 넘길 것
     * (중복 키에는 밑줄이 흔하다 — 이스케이프하지 않으면 임의의 한 글자로 해석된다).
     */
    @Query("""
            select t from AiNewsTopic t
            where (:status is null or t.status = :status)
              and (:category is null or t.category = :category)
              and (:keyword is null
                   or lower(t.title) like concat('%', :keyword, '%') escape '!'
                   or lower(t.memo) like concat('%', :keyword, '%') escape '!')
            order by t.createdAt desc
            """)
    Page<AiNewsTopic> search(@Param("status") AiNewsTopicStatus status,
                             @Param("category") AiNewsCategory category,
                             @Param("keyword") String keyword,
                             Pageable pageable);
}
