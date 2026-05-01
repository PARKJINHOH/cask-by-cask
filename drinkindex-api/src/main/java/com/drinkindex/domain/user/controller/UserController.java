package com.drinkindex.domain.user.controller;

import com.drinkindex.domain.review.dto.ReviewResponse;
import com.drinkindex.domain.review.service.ReviewService;
import com.drinkindex.domain.user.dto.UpdateNicknameRequest;
import com.drinkindex.domain.user.dto.UpdatePasswordRequest;
import com.drinkindex.domain.user.dto.UserResponse;
import com.drinkindex.domain.user.service.UserService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ReviewService reviewService;

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

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteMe(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userService.deleteMe(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/me/reviews")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getMyReviews(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.getMyReviews(userDetails.getUserId(), pageable)));
    }
}
