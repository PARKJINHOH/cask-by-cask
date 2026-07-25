package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialDataDeletionRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SocialDataDeletionRequestRepository
        extends JpaRepository<SocialDataDeletionRequest, Long> {

    Optional<SocialDataDeletionRequest> findByConfirmationCode(String confirmationCode);
    boolean existsByConfirmationCode(String confirmationCode);
}
