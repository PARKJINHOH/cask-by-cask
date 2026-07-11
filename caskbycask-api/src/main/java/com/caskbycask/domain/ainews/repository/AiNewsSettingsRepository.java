package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiNewsSettingsRepository extends JpaRepository<AiNewsSettings, Long> {
}
