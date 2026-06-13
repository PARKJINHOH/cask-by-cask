package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.request.CreateStoreAliasRequest;
import com.caskbycask.domain.pricetracker.dto.request.CreateStoreRequest;
import com.caskbycask.domain.pricetracker.dto.request.MergeStoreRequest;
import com.caskbycask.domain.pricetracker.dto.request.UpdateStoreRequest;
import com.caskbycask.domain.pricetracker.dto.response.StoreAliasResponse;
import com.caskbycask.domain.pricetracker.dto.response.StoreResponse;
import com.caskbycask.domain.pricetracker.entity.Store;
import com.caskbycask.domain.pricetracker.entity.StoreAlias;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.pricetracker.repository.StoreAliasRepository;
import com.caskbycask.domain.pricetracker.repository.StoreRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminStoreService {

    private final StoreRepository storeRepository;
    private final StoreAliasRepository storeAliasRepository;
    private final PriceReportRepository priceReportRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<StoreResponse> getStores(String keyword, Boolean isApproved, Pageable pageable) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        return PageResponse.from(
                storeRepository.findAllForAdmin(kw, isApproved, pageable).map(StoreResponse::from)
        );
    }

    @Transactional
    public StoreResponse createStore(CreateStoreRequest request) {
        Store store = Store.builder()
                .displayName(request.displayName())
                .storeType(request.storeType())
                .dutyfreeChannel(request.dutyfreeChannel())
                .region(request.region())
                .isApproved(true)
                .build();
        return StoreResponse.from(storeRepository.save(store));
    }

    @Transactional
    public StoreResponse updateStore(Long id, UpdateStoreRequest request) {
        Store store = getStore(id);
        store.update(request.displayName(), request.storeType(), request.dutyfreeChannel(), request.region());
        return StoreResponse.from(storeRepository.save(store));
    }

    @Transactional
    public StoreResponse approveStore(Long id, Long adminId) {
        Store store = getStore(id);
        if (store.getIsApproved()) {
            throw new CustomException(ErrorCode.STORE_ALREADY_APPROVED);
        }
        User admin = userRepository.getByIdOrThrow(adminId);
        store.approve(admin);
        return StoreResponse.from(storeRepository.save(store));
    }

    @Transactional
    public void deleteStore(Long id) {
        Store store = getStore(id);
        store.softDelete();
        storeRepository.save(store);
    }

    @Transactional(readOnly = true)
    public List<StoreAliasResponse> getAliases(Long storeId) {
        getStore(storeId); // 존재 확인
        return storeAliasRepository.findByStoreId(storeId)
                .stream().map(StoreAliasResponse::from).toList();
    }

    @Transactional
    public StoreAliasResponse addAlias(Long storeId, CreateStoreAliasRequest request) {
        Store store = getStore(storeId);
        StoreAlias alias = StoreAlias.builder()
                .store(store)
                .alias(request.alias())
                .build();
        return StoreAliasResponse.from(storeAliasRepository.save(alias));
    }

    @Transactional
    public void deleteAlias(Long aliasId) {
        StoreAlias alias = storeAliasRepository.findById(aliasId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));
        storeAliasRepository.delete(alias);
    }

    @Transactional
    public void mergeStore(Long suggestedId, MergeStoreRequest request) {
        Store suggested = getStore(suggestedId);
        Store target = storeRepository.findById(request.targetStoreId())
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));

        // suggested displayName을 target의 별칭으로 등록
        StoreAlias alias = StoreAlias.builder()
                .store(target)
                .alias(suggested.getDisplayName())
                .build();
        storeAliasRepository.save(alias);

        // price_reports의 store 참조를 target으로 전환
        priceReportRepository.updateStoreReference(suggested, target);

        // 제안 매장 소프트 삭제
        suggested.softDelete();
        storeRepository.save(suggested);
    }

    private Store getStore(Long id) {
        return storeRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));
    }
}
