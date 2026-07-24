package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SocialAccountConnectionRepository extends JpaRepository<SocialAccountConnection, Long> {
    Optional<SocialAccountConnection> findByPlatform(SocialPlatform platform);
    List<SocialAccountConnection> findByTokenExpiresAtBefore(LocalDateTime dateTime);
}
