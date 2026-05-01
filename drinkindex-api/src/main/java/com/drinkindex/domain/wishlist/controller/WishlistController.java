package com.drinkindex.domain.wishlist.controller;

import com.drinkindex.domain.wishlist.dto.WishlistRequest;
import com.drinkindex.domain.wishlist.dto.WishlistResponse;
import com.drinkindex.domain.wishlist.entity.enums.WishlistType;
import com.drinkindex.domain.wishlist.service.WishlistService;
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
@RequestMapping("/api/wishlists")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> toggle(
            @Valid @RequestBody WishlistRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        wishlistService.toggle(userDetails.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Page<WishlistResponse>>> getMyWishlist(
            @RequestParam(required = false) WishlistType type,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                wishlistService.getMyWishlist(userDetails.getUserId(), type, pageable)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        wishlistService.delete(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
