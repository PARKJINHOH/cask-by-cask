package com.caskbycask.domain.bottlecollection.service;

import com.caskbycask.domain.bottlecollection.dto.*;
import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.bottlecollection.repository.UserBottleQueryRepository;
import com.caskbycask.domain.bottlecollection.repository.UserBottleRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
        var user = userRepository.getByIdOrThrow(userId);
        Spirit spirit = resolveSpirit(req.spiritId());
        String spiritNameText = normalizeText(req.spiritNameText());
        validateBottleName(spirit, spiritNameText);

        UserBottle bottle = UserBottle.builder()
            .user(user).spirit(spirit).spiritNameText(spiritNameText)
            .category(req.category()).purchaseDate(req.purchaseDate())
            .batch(normalizeText(req.batch())).bottlingYear(normalizeText(req.bottlingYear()))
            .price(req.price()).store(normalizeText(req.store()))
            .status(req.status()).isPublic(Boolean.TRUE.equals(req.isPublic())).memo(normalizeText(req.memo()))
            .build();

        return UserBottleResponse.from(userBottleRepository.save(bottle));
    }

    public UserBottleListResponse getMyBottles(Long userId, SpiritCategory category,
                                                BottleStatus status, Pageable pageable) {
        Page<UserBottle> page = userBottleQueryRepository.findByUser(userId, category, status, pageable);
        BottleStatsDto stats = userBottleQueryRepository.getStats(userId);
        return toListResponse(page, stats, pageable.getPageNumber(), null);
    }

    public UserBottleListResponse getPublicBottles(Long userId, SpiritCategory category, Pageable pageable) {
        // 공개 페이지 제목에 표시할 보틀 소유자 닉네임 (존재하지 않으면 404)
        String ownerNickname = userRepository.getByIdOrThrow(userId)
            .getNickname();
        Page<UserBottle> page = userBottleQueryRepository.findPublicByUser(userId, category, pageable);
        long total = page.getTotalElements();
        // 공개 페이지에서는 총금액 집계 비공개 (타인에게 전체 지출 노출 방지)
        BottleStatsDto stats = new BottleStatsDto(total, 0L, 0L, 0L, List.of());
        return toListResponse(page, stats, pageable.getPageNumber(), ownerNickname);
    }

    public UserBottleResponse getBottle(Long bottleId, Long userId) {
        return UserBottleResponse.from(findAndValidateOwner(bottleId, userId));
    }

    @Transactional
    public UserBottleResponse updateBottle(Long bottleId, Long userId, UserBottleRequest req) {
        UserBottle bottle = findAndValidateOwner(bottleId, userId);
        Spirit spirit = resolveSpirit(req.spiritId());
        String spiritNameText = normalizeText(req.spiritNameText());
        validateBottleName(spirit, spiritNameText);
        bottle.update(spirit, spiritNameText, req.category(),
            req.purchaseDate(), normalizeText(req.batch()), normalizeText(req.bottlingYear()),
            req.price(), normalizeText(req.store()), req.status(), Boolean.TRUE.equals(req.isPublic()), normalizeText(req.memo()));
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

    private void validateBottleName(Spirit spirit, String spiritNameText) {
        if (spirit == null && spiritNameText == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String normalizeText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private UserBottleListResponse toListResponse(Page<UserBottle> page, BottleStatsDto stats,
                                                   int pageNum, String ownerNickname) {
        List<UserBottleResponse> bottles = page.getContent().stream()
            .map(UserBottleResponse::from).toList();
        return new UserBottleListResponse(bottles, stats,
            page.getTotalPages(), page.getTotalElements(), pageNum, ownerNickname);
    }
}
