package com.drinkindex.domain.bottlecollection.service;

import com.drinkindex.domain.bottlecollection.dto.*;
import com.drinkindex.domain.bottlecollection.entity.BottleStatus;
import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import com.drinkindex.domain.bottlecollection.repository.UserBottleQueryRepository;
import com.drinkindex.domain.bottlecollection.repository.UserBottleRepository;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserBottleService {

    private final UserBottleRepository userBottleRepository;
    private final UserBottleQueryRepository userBottleQueryRepository;
    private final UserRepository userRepository;
    private final SpiritRepository spiritRepository;

    @Transactional
    public UserBottleResponse createBottle(Long userId, UserBottleRequest req) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        Spirit spirit = resolveSpirit(req.spiritId());

        UserBottle bottle = UserBottle.builder()
            .user(user).spirit(spirit).spiritNameText(req.spiritNameText())
            .category(req.category()).purchaseDate(req.purchaseDate())
            .batch(req.batch()).bottlingYear(req.bottlingYear())
            .price(req.price()).store(req.store())
            .status(req.status()).isPublic(req.isPublic()).memo(req.memo())
            .build();

        return UserBottleResponse.from(userBottleRepository.save(bottle));
    }

    public UserBottleListResponse getMyBottles(Long userId, SpiritCategory category,
                                                BottleStatus status, Pageable pageable) {
        Page<UserBottle> page = userBottleQueryRepository.findByUser(userId, category, status, pageable);
        BottleStatsDto stats = userBottleQueryRepository.getStats(userId);
        return toListResponse(page, stats, pageable.getPageNumber());
    }

    public UserBottleListResponse getPublicBottles(Long userId, SpiritCategory category, Pageable pageable) {
        Page<UserBottle> page = userBottleQueryRepository.findPublicByUser(userId, category, pageable);
        long total = page.getTotalElements();
        // 공개 페이지에서는 총금액 집계 비공개 (타인에게 전체 지출 노출 방지)
        BottleStatsDto stats = new BottleStatsDto(total, 0L, 0L, 0L, List.of());
        return toListResponse(page, stats, pageable.getPageNumber());
    }

    public UserBottleResponse getBottle(Long bottleId, Long userId) {
        return UserBottleResponse.from(findAndValidateOwner(bottleId, userId));
    }

    @Transactional
    public UserBottleResponse updateBottle(Long bottleId, Long userId, UserBottleRequest req) {
        UserBottle bottle = findAndValidateOwner(bottleId, userId);
        Spirit spirit = resolveSpirit(req.spiritId());
        bottle.update(spirit, req.spiritNameText(), req.category(),
            req.purchaseDate(), req.batch(), req.bottlingYear(),
            req.price(), req.store(), req.status(), req.isPublic(), req.memo());
        return UserBottleResponse.from(bottle);
    }

    @Transactional
    public void deleteBottle(Long bottleId, Long userId) {
        userBottleRepository.delete(findAndValidateOwner(bottleId, userId));
    }

    @Transactional
    public UserBottleResponse toggleStatus(Long bottleId, Long userId) {
        UserBottle bottle = findAndValidateOwner(bottleId, userId);
        bottle.toggleStatus();
        return UserBottleResponse.from(bottle);
    }

    @Transactional
    public UserBottleResponse togglePublic(Long bottleId, Long userId) {
        UserBottle bottle = findAndValidateOwner(bottleId, userId);
        bottle.togglePublic();
        return UserBottleResponse.from(bottle);
    }

    UserBottle findAndValidateOwner(Long bottleId, Long userId) {
        UserBottle bottle = userBottleRepository.findById(bottleId)
            .orElseThrow(() -> new CustomException(ErrorCode.BOTTLE_NOT_FOUND));
        if (!bottle.isOwnedBy(userId)) throw new CustomException(ErrorCode.BOTTLE_ACCESS_DENIED);
        return bottle;
    }

    private Spirit resolveSpirit(Long spiritId) {
        if (spiritId == null) return null;
        return spiritRepository.findById(spiritId)
            .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
    }

    private UserBottleListResponse toListResponse(Page<UserBottle> page, BottleStatsDto stats, int pageNum) {
        List<UserBottleResponse> bottles = page.getContent().stream()
            .map(UserBottleResponse::from).toList();
        return new UserBottleListResponse(bottles, stats,
            page.getTotalPages(), page.getTotalElements(), pageNum);
    }
}
