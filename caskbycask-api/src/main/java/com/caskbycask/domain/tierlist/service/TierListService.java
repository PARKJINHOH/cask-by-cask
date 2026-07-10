package com.caskbycask.domain.tierlist.service;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.tierlist.dto.*;
import com.caskbycask.domain.tierlist.entity.TierList;
import com.caskbycask.domain.tierlist.entity.TierListImage;
import com.caskbycask.domain.tierlist.entity.TierListItem;
import com.caskbycask.domain.tierlist.entity.TierListRow;
import com.caskbycask.domain.tierlist.entity.enums.TierListItemType;
import com.caskbycask.domain.tierlist.repository.TierListImageRepository;
import com.caskbycask.domain.tierlist.repository.TierListItemRepository;
import com.caskbycask.domain.tierlist.repository.TierListRepository;
import com.caskbycask.domain.tierlist.repository.TierListRowRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TierListService {

    private static final int MAX_ROWS = 12;
    private static final int MAX_ITEMS = 200;
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final TierListRepository tierListRepository;
    private final TierListRowRepository tierListRowRepository;
    private final TierListItemRepository tierListItemRepository;
    private final TierListImageRepository tierListImageRepository;
    private final UserRepository userRepository;
    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final ProducerRepository producerRepository;
    private final ValidatedImageUploader validatedImageUploader;

    @Transactional(readOnly = true)
    public List<TierListSummaryResponse> getMyTierLists(Long userId) {
        return tierListRepository.findSummariesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public TierListResponse getMine(Long id, Long userId) {
        TierList tierList = tierListRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIER_LIST_NOT_FOUND));
        return toResponse(tierList, true);
    }

    @Transactional(readOnly = true)
    public TierListResponse getShared(String shareKey) {
        TierList tierList = tierListRepository.findByShareKeyWithUser(shareKey)
                .orElseThrow(() -> new CustomException(ErrorCode.TIER_LIST_NOT_FOUND));
        return toResponse(tierList, false);
    }

    @Transactional
    public TierListResponse create(TierListSaveRequest request, Long userId) {
        validateRequest(request);
        User user = userRepository.getByIdOrThrow(userId);

        TierList tierList = TierList.builder()
                .user(user)
                .title(trimRequired(request.title()))
                .description(trimToNull(request.description()))
                .shareKey(generateShareKey())
                .build();

        tierListRepository.save(tierList);
        replaceContent(tierList, request);
        return toResponse(tierList, true);
    }

    @Transactional
    public TierListResponse update(Long id, TierListSaveRequest request, Long userId) {
        validateRequest(request);
        TierList tierList = tierListRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIER_LIST_NOT_FOUND));

        tierList.updateMeta(trimRequired(request.title()), trimToNull(request.description()));
        tierList.bumpRevision();
        replaceContent(tierList, request);
        return toResponse(tierList, true);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        TierList tierList = tierListRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIER_LIST_NOT_FOUND));
        tierListRepository.delete(tierList);
    }

    @Transactional
    public TierListImageUploadResponse uploadImage(MultipartFile file, Long userId) {
        StoredImage stored = validatedImageUploader.upload(file, "tier-list");
        User uploader = userRepository.getByIdOrThrow(userId);

        TierListImage image = TierListImage.builder()
                .uploadedBy(uploader)
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .subPath(stored.subPath())
                .build();

        return TierListImageUploadResponse.from(tierListImageRepository.save(image));
    }

    @Transactional(readOnly = true)
    public TierListImage getImage(String savedFileName) {
        return tierListImageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.TIER_LIST_IMAGE_NOT_FOUND));
    }

    private TierListResponse toResponse(TierList tierList, boolean owner) {
        List<TierListRowResponse> rows = tierListRowRepository.findByTierListIdOrderBySortOrderAscIdAsc(tierList.getId())
                .stream()
                .map(TierListRowResponse::from)
                .toList();
        List<TierListItemResponse> items = tierListItemRepository.findByTierListIdForResponse(tierList.getId())
                .stream()
                .map(TierListItemResponse::from)
                .toList();
        return TierListResponse.of(tierList, rows, items, owner);
    }

    private void replaceContent(TierList tierList, TierListSaveRequest request) {
        tierListItemRepository.deleteByTierListId(tierList.getId());
        tierListRowRepository.deleteByTierListId(tierList.getId());

        Map<String, TierListRow> rowMap = new LinkedHashMap<>();
        List<TierListRow> rows = new ArrayList<>();
        for (int i = 0; i < request.rows().size(); i++) {
            TierListRowRequest rowRequest = request.rows().get(i);
            String rowKey = trimRequired(rowRequest.rowKey());
            if (rowMap.containsKey(rowKey)) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            String color = trimRequired(rowRequest.color());
            if (!HEX_COLOR.matcher(color).matches()) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            TierListRow row = TierListRow.builder()
                    .tierList(tierList)
                    .label(trimRequired(rowRequest.label()))
                    .color(color)
                    .sortOrder(rowRequest.sortOrder() != null ? rowRequest.sortOrder() : i)
                    .build();
            rows.add(row);
            rowMap.put(rowKey, row);
        }
        tierListRowRepository.saveAll(rows);

        List<TierListItemRequest> itemRequests = request.items() != null ? request.items() : List.of();
        List<TierListItem> items = new ArrayList<>();
        for (int i = 0; i < itemRequests.size(); i++) {
            TierListItemRequest itemRequest = itemRequests.get(i);
            TierListRow row = null;
            if (StringUtils.hasText(itemRequest.rowKey())) {
                row = rowMap.get(itemRequest.rowKey().trim());
                if (row == null) {
                    throw new CustomException(ErrorCode.INVALID_INPUT);
                }
            }

            ResolvedTarget target = resolveTarget(itemRequest);
            items.add(TierListItem.builder()
                    .tierList(tierList)
                    .row(row)
                    .itemType(itemRequest.itemType())
                    .spirit(target.spirit())
                    .producer(target.producer())
                    .displayName(trimRequired(itemRequest.displayName()))
                    .imageUrl(resolveImageUrl(itemRequest, target.spirit()))
                    .sortOrder(itemRequest.sortOrder() != null ? itemRequest.sortOrder() : i)
                    .build());
        }
        tierListItemRepository.saveAll(items);
    }

    private ResolvedTarget resolveTarget(TierListItemRequest request) {
        TierListItemType type = request.itemType();
        if (type == TierListItemType.SPIRIT) {
            if (request.spiritId() == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            Spirit spirit = spiritRepository.findByIdAndStatus(request.spiritId(), SpiritStatus.ACTIVE)
                    .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
            return new ResolvedTarget(spirit, null);
        }
        if (type == TierListItemType.PRODUCER) {
            if (request.producerId() == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            Producer producer = producerRepository.findById(request.producerId())
                    .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
            return new ResolvedTarget(null, producer);
        }
        return new ResolvedTarget(null, null);
    }

    private String resolveImageUrl(TierListItemRequest request, Spirit spirit) {
        if (StringUtils.hasText(request.imageUrl())) {
            return request.imageUrl().trim();
        }
        if (spirit == null) {
            return null;
        }
        return spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(spirit.getId())
                .map(SpiritImage::getImageUrl)
                .orElse(null);
    }

    private void validateRequest(TierListSaveRequest request) {
        if (request.rows() == null || request.rows().isEmpty() || request.rows().size() > MAX_ROWS) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        int itemCount = request.items() != null ? request.items().size() : 0;
        if (itemCount > MAX_ITEMS) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String generateShareKey() {
        String key;
        do {
            key = UUID.randomUUID().toString().replace("-", "");
        } while (tierListRepository.existsByShareKey(key));
        return key;
    }

    private String trimRequired(String value) {
        if (!StringUtils.hasText(value)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return value.trim();
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record ResolvedTarget(Spirit spirit, Producer producer) {
    }
}
