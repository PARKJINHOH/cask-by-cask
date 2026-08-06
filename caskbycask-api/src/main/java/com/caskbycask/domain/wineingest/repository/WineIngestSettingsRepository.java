package com.caskbycask.domain.wineingest.repository;

import com.caskbycask.domain.wineingest.entity.WineIngestSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WineIngestSettingsRepository extends JpaRepository<WineIngestSettings, Long> {}
