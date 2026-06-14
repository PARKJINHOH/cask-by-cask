package com.caskbycask.domain.user.repository;

import com.caskbycask.domain.user.entity.UserSocialAccount;
import com.caskbycask.domain.user.entity.enums.SocialProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserSocialAccountRepository extends JpaRepository<UserSocialAccount, Long> {

    Optional<UserSocialAccount> findByProviderAndProviderUserId(SocialProvider provider, String providerUserId);

    List<UserSocialAccount> findByUserId(Long userId);

    Optional<UserSocialAccount> findByUserIdAndProvider(Long userId, SocialProvider provider);

    boolean existsByUserIdAndProvider(Long userId, SocialProvider provider);

    long countByUserId(Long userId);
}
