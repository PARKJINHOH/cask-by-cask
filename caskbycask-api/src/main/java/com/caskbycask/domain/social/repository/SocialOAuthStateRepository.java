package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialOAuthState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.time.LocalDateTime;

public interface SocialOAuthStateRepository extends JpaRepository<SocialOAuthState, Long> {
    Optional<SocialOAuthState> findByStateHash(String stateHash);
    long deleteByExpiresAtBefore(LocalDateTime dateTime);
}
