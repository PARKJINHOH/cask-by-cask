package com.caskbycask.domain.wineingest.repository;

import com.caskbycask.domain.wineingest.entity.WineIngestSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WineIngestSettingsRepository extends JpaRepository<WineIngestSettings, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from WineIngestSettings s where s.id = :id")
    Optional<WineIngestSettings> findByIdForUpdate(@Param("id") Long id);
}
