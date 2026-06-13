package com.caskbycask.global.auth.security;

import com.caskbycask.domain.user.dto.AuthUserView;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return toUserDetails(user);
    }

    /**
     * JWT 인증 필터 hot-path — 요청당 1회 호출.
     *   - EAGER 연관을 끌어오지 않는 경량 프로젝션(findAuthViewById) 사용
     *   - 결과를 60초 캐싱(authUser)해 동일 사용자의 연속 요청에서 DB 조회 생략
     *     (권한·활성여부 변경 시 AuthUserCache.evict 로 즉시 무효화, 누락 시 TTL 로 자동 만료)
     */
    @Cacheable(cacheNames = AuthUserCache.CACHE_NAME, key = "#userId")
    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long userId) {
        AuthUserView view = userRepository.findAuthViewById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return new CustomUserDetails(
                view.id(),
                view.email(),
                view.password(),
                view.role(),
                view.active()
        );
    }

    private CustomUserDetails toUserDetails(User user) {
        return new CustomUserDetails(
                user.getId(),
                user.getEmail(),
                user.getPassword(),
                user.getRole(),
                user.getIsActive()
        );
    }
}
