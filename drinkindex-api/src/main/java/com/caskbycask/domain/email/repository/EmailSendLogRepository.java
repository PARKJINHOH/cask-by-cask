package com.caskbycask.domain.email.repository;

import com.caskbycask.domain.email.entity.EmailSendLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EmailSendLogRepository extends JpaRepository<EmailSendLog, Long> {

    @Query("SELECT l FROM EmailSendLog l ORDER BY l.sentAt DESC")
    Page<EmailSendLog> findAllOrderBySentAtDesc(Pageable pageable);
}
