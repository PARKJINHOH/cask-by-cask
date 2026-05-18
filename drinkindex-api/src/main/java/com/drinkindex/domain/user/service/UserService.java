package com.drinkindex.domain.user.service;

import com.drinkindex.domain.user.dto.UpdateNicknameRequest;
import com.drinkindex.domain.user.dto.UpdatePasswordRequest;
import com.drinkindex.domain.user.dto.UserResponse;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.jwt.RefreshTokenRepository;
import com.drinkindex.global.email.EmailSender;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long NICKNAME_CHANGE_DAYS = 60;
    private static final String RESET_PW_COOLDOWN_PREFIX = "user:reset-pw:cooldown:";
    private static final Duration RESET_PW_COOLDOWN_TTL = Duration.ofMinutes(1);
    private static final String TEMP_PW_CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    private static final int TEMP_PW_LENGTH = 12;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailSender emailSender;
    private final StringRedisTemplate redisTemplate;

    @Transactional(readOnly = true)
    public UserResponse getMe(Long userId) {
        return UserResponse.from(findUser(userId));
    }

    @Transactional
    public UserResponse updateNickname(Long userId, UpdateNicknameRequest request) {
        User user = findUser(userId);

        if (Boolean.TRUE.equals(user.getNicknameFixed())) {
            throw new CustomException(ErrorCode.NICKNAME_FIXED);
        }

        LocalDateTime baseline = user.getNicknameChangedAt() != null
                ? user.getNicknameChangedAt()
                : user.getCreatedAt();
        if (baseline != null && baseline.plusDays(NICKNAME_CHANGE_DAYS).isAfter(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.NICKNAME_CHANGE_TOO_SOON);
        }

        if (userRepository.existsByNicknameAndIdNot(request.nickname(), userId)) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }

        user.updateNickname(request.nickname());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse fixNickname(Long userId) {
        User user = findUser(userId);
        if (Boolean.TRUE.equals(user.getNicknameFixed())) {
            throw new CustomException(ErrorCode.NICKNAME_ALREADY_FIXED);
        }
        user.fixNickname();
        return UserResponse.from(user);
    }

    @Transactional
    public void updatePassword(Long userId, UpdatePasswordRequest request) {
        User user = findUser(userId);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        user.updatePassword(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional
    public void resetTempPassword(Long userId) {
        String cooldownKey = RESET_PW_COOLDOWN_PREFIX + userId;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            throw new CustomException(ErrorCode.VERIFICATION_COOLDOWN);
        }

        User user = findUser(userId);
        String tempPassword = generateTempPassword();
        user.updatePassword(passwordEncoder.encode(tempPassword));

        redisTemplate.opsForValue().set(cooldownKey, "1", RESET_PW_COOLDOWN_TTL);

        emailSender.send(
            user.getEmail(),
            "[DrinkIndex] 임시 비밀번호 안내",
            buildTempPasswordBody(user.getNickname(), tempPassword)
        );
    }

    @Transactional
    public void deleteMe(Long userId) {
        User user = findUser(userId);
        user.softDelete();
        refreshTokenRepository.deleteByUserId(userId);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private String generateTempPassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(TEMP_PW_LENGTH);
        for (int i = 0; i < TEMP_PW_LENGTH; i++) {
            sb.append(TEMP_PW_CHARS.charAt(random.nextInt(TEMP_PW_CHARS.length())));
        }
        return sb.toString();
    }

    private String buildTempPasswordBody(String nickname, String tempPassword) {
        return """
                안녕하세요, %s님.

                DrinkIndex 임시 비밀번호가 발급되었습니다.

                임시 비밀번호: %s

                로그인 후 반드시 비밀번호를 변경해주세요.
                본인이 요청하지 않았다면 즉시 고객센터에 문의해주세요.
                """.formatted(nickname, tempPassword);
    }
}
