package com.drinkindex.domain.user.controller;

import com.drinkindex.domain.community.dto.BlockedUserResponse;
import com.drinkindex.domain.community.dto.UserMentionResponse;
import com.drinkindex.domain.community.entity.UserBlock;
import com.drinkindex.domain.community.repository.UserBlockRepository;
import com.drinkindex.domain.review.dto.ReviewResponse;
import com.drinkindex.domain.review.service.ReviewService;
import com.drinkindex.domain.user.dto.AdultVerificationRequest;
import com.drinkindex.domain.user.dto.UpdateEmailSubscriptionRequest;
import com.drinkindex.domain.user.dto.UpdateNicknameRequest;
import com.drinkindex.domain.user.dto.UpdatePasswordRequest;
import com.drinkindex.domain.user.dto.UserResponse;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.domain.user.service.UserService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ReviewService reviewService;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMe(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(
                ApiResponse.success(userService.getMe(userDetails.getUserId())));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateNickname(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UpdateNicknameRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(userService.updateNickname(userDetails.getUserId(), request)));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UpdatePasswordRequest request) {
        userService.updatePassword(userDetails.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/me/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userService.resetTempPassword(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/me/fix-nickname")
    public ResponseEntity<ApiResponse<UserResponse>> fixNickname(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(
                ApiResponse.success(userService.fixNickname(userDetails.getUserId())));
    }

    @PostMapping(value = "/me/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponse>> uploadProfileImage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(
                ApiResponse.success(userService.uploadProfileImage(userDetails.getUserId(), file)));
    }

    @DeleteMapping("/me/profile-image")
    public ResponseEntity<ApiResponse<UserResponse>> deleteProfileImage(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(
                ApiResponse.success(userService.deleteProfileImage(userDetails.getUserId())));
    }

    @PostMapping("/me/adult-verification")
    public ResponseEntity<ApiResponse<UserResponse>> verifyAdult(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AdultVerificationRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(userService.verifyAdult(userDetails.getUserId(), request)));
    }

    @PatchMapping("/me/email-subscription")
    public ResponseEntity<ApiResponse<UserResponse>> updateEmailSubscription(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody UpdateEmailSubscriptionRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(userService.updateEmailSubscription(userDetails.getUserId(), request)));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteMe(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userService.deleteMe(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── @멘션 자동완성: 닉네임 prefix 검색, 차단 사용자 제외 ───

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<UserMentionResponse>>> searchByNickname(
            @RequestParam String nickname,
            @RequestParam(defaultValue = "5") int limit,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<UserMentionResponse> result = userRepository
                .findByNicknamePrefixExcludingBlocked(nickname, userDetails.getUserId(),
                        PageRequest.of(0, limit))
                .stream()
                .map(UserMentionResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ─── 사용자 차단 토글 ──────────────────────────────────────

    @PostMapping("/{userId}/block")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> toggleBlock(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long blockerId = userDetails.getUserId();
        if (blockerId.equals(userId)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        userBlockRepository.findByBlockerIdAndBlockedId(blockerId, userId)
                .ifPresentOrElse(
                        userBlockRepository::delete,
                        () -> {
                            User blocker = userRepository.findById(blockerId)
                                    .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
                            User blocked = userRepository.findById(userId)
                                    .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
                            userBlockRepository.save(
                                    UserBlock.builder().blocker(blocker).blocked(blocked).build());
                        }
                );
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 내가 차단한 사용자 목록 ───────────────────────────────
    @GetMapping("/me/blocks")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<BlockedUserResponse>>> getMyBlocks(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<BlockedUserResponse> result = userBlockRepository
                .findByBlockerIdWithBlocked(userDetails.getUserId())
                .stream()
                .map(BlockedUserResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ─── 차단 해제 ─────────────────────────────────────────────
    @DeleteMapping("/{userId}/block")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> unblock(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        userBlockRepository.findByBlockerIdAndBlockedId(userDetails.getUserId(), userId)
                .ifPresent(userBlockRepository::delete);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/me/reviews")
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getMyReviews(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(reviewService.getMyReviews(userDetails.getUserId(), pageable))));
    }
}
