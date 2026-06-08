package com.drinkindex.domain.user.service;

import com.drinkindex.domain.nicknamebadword.service.NicknameBadWordValidator;
import com.drinkindex.domain.user.dto.AdultVerificationRequest;
import com.drinkindex.domain.user.dto.UpdateEmailSubscriptionRequest;
import com.drinkindex.domain.user.dto.UpdateNicknameRequest;
import com.drinkindex.domain.user.dto.UpdatePasswordRequest;
import com.drinkindex.domain.user.dto.UserResponse;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.AdultVerifyMethod;
import com.drinkindex.domain.user.policy.AccountPolicy;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.email.EmailSender;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
import com.drinkindex.global.storage.ImageUploadResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long NICKNAME_CHANGE_DAYS = 60;
    private static final long PROFILE_IMAGE_CHANGE_DAYS = 30;
    private static final long PROFILE_IMAGE_MAX_BYTES = 2L * 1024 * 1024; // 2MB
    private static final Set<String> ALLOWED_MIME_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "webp");
    private static final String PROFILE_SUB_PATH = "profiles";
    private static final String RESET_PW_COOLDOWN_PREFIX = "user:reset-pw:cooldown:";
    private static final Duration RESET_PW_COOLDOWN_TTL = Duration.ofMinutes(1);
    private static final String TEMP_PW_CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    private static final int TEMP_PW_LENGTH = 12;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final StringRedisTemplate redisTemplate;
    private final FileStorageService fileStorageService;
    private final NicknameBadWordValidator nicknameBadWordValidator;
    private final AccountHardDeleteService accountHardDeleteService;

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

        nicknameBadWordValidator.validate(request.nickname());

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
        // 임시 비밀번호 로그인 후 즉시 변경 강제 (updatePassword가 플래그를 끄므로 이후에 설정)
        user.requirePasswordChange();

        redisTemplate.opsForValue().set(cooldownKey, "1", RESET_PW_COOLDOWN_TTL);

        emailSender.send(
            user.getEmail(),
            "[DrinkIndex] 임시 비밀번호 안내",
            buildTempPasswordBody(user.getNickname(), tempPassword)
        );
    }

    /**
     * 자가 선언형 성인인증. 클라이언트가 보낸 생년월일을 신뢰하지 않고 서버에서 만 나이를 재계산한다.
     * 추후 PASS·소셜 로그인 연동 시 별도 메서드(method=MOBILE/SOCIAL)로 분기하되, 인증 확정은
     * 동일하게 {@code User.verifyAdult(...)} 로 수렴한다.
     */
    @Transactional
    public UserResponse verifyAdult(Long userId, AdultVerificationRequest request) {
        User user = findUser(userId);

        if (user.isAdultVerified()) {
            throw new CustomException(ErrorCode.ALREADY_ADULT_VERIFIED);
        }

        LocalDate birthDate = request.birthDate();
        if (birthDate == null || birthDate.isAfter(LocalDate.now())) {
            throw new CustomException(ErrorCode.INVALID_BIRTH_DATE);
        }
        if (!AccountPolicy.isAdult(birthDate)) {
            throw new CustomException(ErrorCode.ADULT_VERIFY_UNDERAGE);
        }

        user.verifyAdult(birthDate, AdultVerifyMethod.SELF);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateEmailSubscription(Long userId, UpdateEmailSubscriptionRequest request) {
        User user = findUser(userId);
        user.updateEmailSubscription(request.emailSubscribed());
        return UserResponse.from(user);
    }

    /**
     * 회원 탈퇴 — 개인정보 파기(영구 삭제).
     * 게시글·리뷰·댓글은 공용 "탈퇴한사용자" 계정으로 재귀속 보존하고, 그 외 개인 데이터와
     * 계정(users) 행은 물리 삭제한다. 동일 이메일로 재가입 시 기존 데이터와 연결되지 않는다.
     */
    @Transactional
    public void deleteMe(Long userId) {
        accountHardDeleteService.hardDelete(userId);
    }

    @Transactional
    public UserResponse uploadProfileImage(Long userId, MultipartFile file) {
        validateProfileImage(file);

        User user = findUser(userId);

        if (user.getProfileImageChangedAt() != null &&
                user.getProfileImageChangedAt().plusDays(PROFILE_IMAGE_CHANGE_DAYS).isAfter(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.PROFILE_IMAGE_CHANGE_TOO_SOON);
        }

        if (user.getProfileImageUrl() != null) {
            deleteStoredProfileImage(user.getProfileImageUrl());
        }

        String ext = getExtension(file.getOriginalFilename());
        String originalSavedFileName = "profile_" + userId + "_" + System.currentTimeMillis() + "." + ext;
        String mimeType = file.getContentType() != null ? file.getContentType().toLowerCase() : "image/jpeg";
        ImageUploadResult result = fileStorageService.uploadImage(file, originalSavedFileName, PROFILE_SUB_PATH, mimeType);

        user.updateProfileImage(result.imageUrl());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse deleteProfileImage(Long userId) {
        User user = findUser(userId);
        if (user.getProfileImageUrl() == null) {
            throw new CustomException(ErrorCode.PROFILE_IMAGE_NOT_FOUND);
        }
        deleteStoredProfileImage(user.getProfileImageUrl());
        user.removeProfileImage();
        return UserResponse.from(user);
    }

    private void validateProfileImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.PROFILE_IMAGE_INVALID_FORMAT);
        }
        if (file.getSize() > PROFILE_IMAGE_MAX_BYTES) {
            throw new CustomException(ErrorCode.PROFILE_IMAGE_SIZE_EXCEEDED);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new CustomException(ErrorCode.PROFILE_IMAGE_INVALID_FORMAT);
        }
        String ext = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new CustomException(ErrorCode.PROFILE_IMAGE_INVALID_FORMAT);
        }
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) return "jpg";
        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
    }

    private void deleteStoredProfileImage(String profileImageUrl) {
        int lastSlash = profileImageUrl.lastIndexOf('/');
        if (lastSlash >= 0) {
            String savedFileName = profileImageUrl.substring(lastSlash + 1);
            fileStorageService.delete(savedFileName, PROFILE_SUB_PATH);
        }
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
