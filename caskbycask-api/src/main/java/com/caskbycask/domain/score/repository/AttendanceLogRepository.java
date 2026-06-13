package com.caskbycask.domain.score.repository;

import com.caskbycask.domain.score.entity.AttendanceLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {

    boolean existsByUserIdAndAttendanceDate(Long userId, LocalDate date);

    Optional<AttendanceLog> findByUserIdAndAttendanceDate(Long userId, LocalDate date);
}
