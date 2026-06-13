package com.caskbycask.domain.admin.repository;

import com.caskbycask.domain.admin.entity.AdminLog;
import com.caskbycask.domain.admin.entity.enums.AdminLogType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AdminLogRepository extends JpaRepository<AdminLog, Long> {

    @Query("""
        SELECT l FROM AdminLog l
        JOIN FETCH l.actor
        WHERE (:logTypes IS NULL OR l.logType IN :logTypes)
          AND (:actorEmail IS NULL OR l.actor.email LIKE %:actorEmail%)
          AND (:from IS NULL OR l.createdAt >= :from)
          AND (:to IS NULL OR l.createdAt <= :to)
        ORDER BY l.createdAt DESC
        """)
    Page<AdminLog> search(
            @Param("logTypes") List<AdminLogType> logTypes,
            @Param("actorEmail") String actorEmail,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );
}
