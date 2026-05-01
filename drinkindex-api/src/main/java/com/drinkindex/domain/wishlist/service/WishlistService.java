package com.drinkindex.domain.wishlist.service;

import com.drinkindex.domain.spirit.entity.SpiritImage;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritImageRepository;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.domain.wishlist.dto.WishlistRequest;
import com.drinkindex.domain.wishlist.dto.WishlistResponse;
import com.drinkindex.domain.wishlist.entity.Wishlist;
import com.drinkindex.domain.wishlist.entity.enums.WishlistType;
import com.drinkindex.domain.wishlist.repository.WishlistRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final UserRepository userRepository;

    // ── 토글 ──────────────────────────────────────────────

    @Transactional
    public void toggle(Long userId, WishlistRequest request) {
        spiritRepository.findByIdAndStatus(request.spiritId(), SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        Optional<Wishlist> existing = wishlistRepository.findByUserIdAndSpiritIdAndType(
                userId, request.spiritId(), request.type());

        if (existing.isPresent()) {
            wishlistRepository.delete(existing.get());
        } else {
            User userRef = userRepository.getReferenceById(userId);
            var spiritRef = spiritRepository.getReferenceById(request.spiritId());

            Wishlist wishlist = Wishlist.builder()
                    .user(userRef)
                    .spirit(spiritRef)
                    .type(request.type())
                    .build();
            wishlistRepository.save(wishlist);
        }
    }

    // ── 내 목록 조회 ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<WishlistResponse> getMyWishlist(Long userId, WishlistType type, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Wishlist> page = type != null
                ? wishlistRepository.findByUserIdAndTypeFetchSpirit(userId, type, sorted)
                : wishlistRepository.findByUserIdFetchSpirit(userId, sorted);

        List<Long> spiritIds = page.stream().map(w -> w.getSpirit().getId()).toList();
        if (spiritIds.isEmpty()) {
            return page.map(w -> WishlistResponse.of(w, null));
        }

        Map<Long, String> primaryImages = spiritImageRepository
                .findBySpiritIdInAndIsPrimaryTrue(spiritIds)
                .stream()
                .collect(Collectors.toMap(
                        img -> img.getSpirit().getId(),
                        SpiritImage::getImageUrl
                ));

        return page.map(w ->
                WishlistResponse.of(w, primaryImages.get(w.getSpirit().getId())));
    }

    // ── 삭제 ──────────────────────────────────────────────

    @Transactional
    public void delete(Long wishlistId, Long userId) {
        Wishlist wishlist = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new CustomException(ErrorCode.WISHLIST_ITEM_NOT_FOUND));

        if (!wishlist.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.WISHLIST_ACCESS_DENIED);
        }

        wishlistRepository.delete(wishlist);
    }
}
