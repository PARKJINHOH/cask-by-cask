package com.drinkindex.domain.pricetracker.service;

import com.drinkindex.domain.pricetracker.dto.request.SuggestStoreRequest;
import com.drinkindex.domain.pricetracker.dto.response.StoreSearchResponse;
import com.drinkindex.domain.pricetracker.entity.Store;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;
import com.drinkindex.domain.pricetracker.repository.StoreRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final BadWordFilter badWordFilter;

    @Transactional(readOnly = true)
    public List<StoreSearchResponse> searchStores(String keyword, StoreType storeType, int limit) {
        String kw = (keyword == null) ? "" : keyword.trim();
        var pageable = PageRequest.of(0, limit);
        List<Store> stores = (storeType != null)
                ? storeRepository.searchApprovedByType(kw, storeType, pageable)
                : storeRepository.searchApproved(kw, pageable);
        return stores.stream().map(StoreSearchResponse::from).toList();
    }

    @Transactional
    public StoreSearchResponse suggestStore(Long userId, SuggestStoreRequest request) {
        // [패치 5] 매장 제안 시 매장명 욕설 필터 (악의적 매장명 방지)
        badWordFilter.validate(request.displayName());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Store store = Store.builder()
                .displayName(request.displayName())
                .storeType(request.storeType())
                .dutyfreeChannel(request.dutyfreeChannel())
                .region(request.region())
                .createdBy(user)
                .build();

        return StoreSearchResponse.from(storeRepository.save(store));
    }
}
