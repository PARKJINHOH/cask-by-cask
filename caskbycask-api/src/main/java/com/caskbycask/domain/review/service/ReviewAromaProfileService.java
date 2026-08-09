package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.AromaProfileItemRequest;
import com.caskbycask.domain.review.dto.AromaProfileRequest;
import com.caskbycask.domain.review.dto.AromaProfileResponse;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.ReviewAromaProfile;
import com.caskbycask.domain.review.entity.ReviewAromaProfileItem;
import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.entity.enums.AromaProfilePhase;
import com.caskbycask.domain.review.entity.enums.AromaType;
import com.caskbycask.domain.review.repository.ReviewAromaProfileRepository;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewAromaProfileService {

    public static final int SCHEMA_VERSION = 1;
    public static final int MIN_ITEMS = 3;
    public static final int MAX_ITEMS = 8;
    private static final Set<SpiritCategory> SUPPORTED_CATEGORIES = Set.of(SpiritCategory.WHISKY);

    private final ReviewAromaProfileRepository profileRepository;

    @Transactional
    public List<AromaProfileResponse> replaceForReview(
            Review review,
            List<AromaProfileRequest> requests,
            String noseNotes,
            String tasteNotes,
            String finishNotes
    ) {
        if (requests == null) {
            List<ReviewAromaProfile> existingProfiles = profileRepository.findByReviewIds(List.of(review.getId()));
            if (existingProfiles.isEmpty()) return List.of();

            // null means "keep the profile", but the kept axes still have to be a subset of
            // the aromas after this review update. This prevents a tag-only update from
            // leaving an invalid profile behind.
            validate(
                    review.getSpirit().getCategory(),
                    toRequests(existingProfiles),
                    noseNotes,
                    tasteNotes,
                    finishNotes);
            return toResponses(existingProfiles);
        }
        List<ValidatedProfile> validated = validate(
                review.getSpirit().getCategory(), requests, noseNotes, tasteNotes, finishNotes);
        profileRepository.deleteByReviewId(review.getId());
        if (validated.isEmpty()) return List.of();
        return saveForReview(review, validated).stream().map(AromaProfileResponse::from).toList();
    }

    @Transactional
    public List<AromaProfileResponse> replaceForVariantRequest(
            SpiritVariantReviewRequest request,
            List<AromaProfileRequest> requests,
            String noseNotes,
            String tasteNotes,
            String finishNotes
    ) {
        List<AromaProfileRequest> safeRequests = requests == null ? List.of() : requests;
        List<ValidatedProfile> validated = validate(
                request.getMasterSpirit().getCategory(), safeRequests, noseNotes, tasteNotes, finishNotes);
        profileRepository.deleteByVariantRequestId(request.getId());
        if (validated.isEmpty()) return List.of();
        return saveForVariantRequest(request, validated).stream().map(AromaProfileResponse::from).toList();
    }

    @Transactional
    public void transferToReview(SpiritVariantReviewRequest request, Review review) {
        List<ReviewAromaProfile> profiles = profileRepository.findByVariantRequestIds(List.of(request.getId()));
        profiles.forEach(profile -> profile.transferToReview(review));
    }

    @Transactional(readOnly = true)
    public List<AromaProfileResponse> findByReviewId(Long reviewId) {
        if (reviewId == null) return List.of();
        return toResponses(profileRepository.findByReviewIds(List.of(reviewId)));
    }

    @Transactional(readOnly = true)
    public Map<Long, List<AromaProfileResponse>> findByReviewIds(Collection<Long> reviewIds) {
        if (reviewIds == null || reviewIds.isEmpty()) return Map.of();
        return groupResponses(
                profileRepository.findByReviewIds(reviewIds),
                profile -> profile.getReview().getId());
    }

    @Transactional(readOnly = true)
    public List<AromaProfileResponse> findByVariantRequestId(Long requestId) {
        if (requestId == null) return List.of();
        return toResponses(profileRepository.findByVariantRequestIds(List.of(requestId)));
    }

    @Transactional(readOnly = true)
    public Map<Long, List<AromaProfileResponse>> findByVariantRequestIds(Collection<Long> requestIds) {
        if (requestIds == null || requestIds.isEmpty()) return Map.of();
        return groupResponses(
                profileRepository.findByVariantRequestIds(requestIds),
                profile -> profile.getVariantReviewRequest().getId());
    }

    private List<ReviewAromaProfile> saveForReview(Review review, List<ValidatedProfile> profiles) {
        return profileRepository.saveAll(profiles.stream()
                .map(profile -> buildProfile(review, null, profile))
                .toList());
    }

    private List<ReviewAromaProfile> saveForVariantRequest(
            SpiritVariantReviewRequest request,
            List<ValidatedProfile> profiles
    ) {
        return profileRepository.saveAll(profiles.stream()
                .map(profile -> buildProfile(null, request, profile))
                .toList());
    }

    private ReviewAromaProfile buildProfile(
            Review review,
            SpiritVariantReviewRequest request,
            ValidatedProfile validated
    ) {
        ReviewAromaProfile profile = ReviewAromaProfile.builder()
                .review(review)
                .variantReviewRequest(request)
                .phase(validated.phase())
                .schemaVersion(SCHEMA_VERSION)
                .build();
        for (int index = 0; index < validated.items().size(); index++) {
            ValidatedItem item = validated.items().get(index);
            profile.addItem(ReviewAromaProfileItem.builder()
                    .aromaType(item.aromaType())
                    .aromaKey(item.aromaKey())
                    .labelSnapshot(item.labelSnapshot())
                    .intensity(item.intensity())
                    .sortOrder(index)
                    .build());
        }
        return profile;
    }

    private List<ValidatedProfile> validate(
            SpiritCategory category,
            List<AromaProfileRequest> requests,
            String noseNotes,
            String tasteNotes,
            String finishNotes
    ) {
        if (requests == null || requests.isEmpty()) return List.of();
        if (!SUPPORTED_CATEGORIES.contains(category)) {
            throw new CustomException(ErrorCode.REVIEW_AROMA_PROFILE_UNSUPPORTED);
        }

        Map<AromaProfilePhase, Set<AromaRef>> selectedByPhase = Map.of(
                AromaProfilePhase.NOSE, parseAromaNotes(noseNotes),
                AromaProfilePhase.PALATE, parseAromaNotes(tasteNotes),
                AromaProfilePhase.FINISH, parseAromaNotes(finishNotes)
        );
        Set<AromaProfilePhase> phases = EnumSet.noneOf(AromaProfilePhase.class);
        List<ValidatedProfile> result = new ArrayList<>();
        for (AromaProfileRequest request : requests) {
            if (request == null || request.phase() == null || !phases.add(request.phase())
                    || !Objects.equals(request.schemaVersion(), SCHEMA_VERSION)
                    || request.items() == null
                    || request.items().size() < MIN_ITEMS
                    || request.items().size() > MAX_ITEMS) {
                throw invalidProfile();
            }

            Set<AromaRef> selected = selectedByPhase.get(request.phase());
            Set<AromaRef> seen = new HashSet<>();
            List<ValidatedItem> items = new ArrayList<>();
            for (AromaProfileItemRequest item : request.items()) {
                ValidatedItem validatedItem = validateItem(item);
                AromaRef ref = new AromaRef(validatedItem.aromaType(), validatedItem.aromaKey());
                if (!seen.add(ref) || !selected.contains(ref)) throw invalidProfile();
                items.add(validatedItem);
            }
            result.add(new ValidatedProfile(request.phase(), items));
        }
        result.sort(Comparator.comparingInt(profile -> phaseOrder(profile.phase())));
        return result;
    }

    private ValidatedItem validateItem(AromaProfileItemRequest item) {
        if (item == null || item.aromaType() == null || !StringUtils.hasText(item.aromaKey())
                || !StringUtils.hasText(item.labelSnapshot()) || item.intensity() == null
                || item.intensity() < 1 || item.intensity() > 5) {
            throw invalidProfile();
        }
        String aromaKey = item.aromaKey().trim();
        String label = item.labelSnapshot().trim();
        if (aromaKey.length() > 255 || label.length() > 100) throw invalidProfile();
        if (item.aromaType() == AromaType.CUSTOM && !aromaKey.equals(label)) {
            throw invalidProfile();
        }
        return new ValidatedItem(item.aromaType(), aromaKey, label, item.intensity());
    }

    private Set<AromaRef> parseAromaNotes(String raw) {
        if (!StringUtils.hasText(raw)) return Set.of();
        Set<AromaRef> result = new LinkedHashSet<>();
        for (String token : raw.split(",")) {
            if (!StringUtils.hasText(token)) continue;
            if (token.startsWith("c:")) {
                try {
                    String value = URLDecoder.decode(token.substring(2), StandardCharsets.UTF_8).trim();
                    if (!value.isEmpty()) result.add(new AromaRef(AromaType.CUSTOM, value));
                } catch (IllegalArgumentException ignored) {
                    throw invalidProfile();
                }
            } else {
                result.add(new AromaRef(AromaType.ID, token.trim()));
            }
        }
        return result;
    }

    private Map<Long, List<AromaProfileResponse>> groupResponses(
            List<ReviewAromaProfile> profiles,
            Function<ReviewAromaProfile, Long> ownerId
    ) {
        Map<Long, List<ReviewAromaProfile>> grouped = profiles.stream().collect(Collectors.groupingBy(
                ownerId,
                LinkedHashMap::new,
                Collectors.toList()
        ));
        return grouped.entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                entry -> toResponses(entry.getValue()),
                (left, right) -> left,
                LinkedHashMap::new
        ));
    }

    private List<AromaProfileResponse> toResponses(List<ReviewAromaProfile> profiles) {
        return profiles.stream()
                .sorted(Comparator.comparingInt(profile -> phaseOrder(profile.getPhase())))
                .map(AromaProfileResponse::from)
                .toList();
    }

    private List<AromaProfileRequest> toRequests(List<ReviewAromaProfile> profiles) {
        return profiles.stream()
                .map(profile -> new AromaProfileRequest(
                        profile.getPhase(),
                        profile.getSchemaVersion(),
                        profile.getItems().stream()
                                .map(item -> new AromaProfileItemRequest(
                                        item.getAromaType(),
                                        item.getAromaKey(),
                                        item.getLabelSnapshot(),
                                        item.getIntensity()))
                                .toList()))
                .toList();
    }

    private int phaseOrder(AromaProfilePhase phase) {
        return switch (phase) {
            case NOSE -> 0;
            case PALATE -> 1;
            case FINISH -> 2;
        };
    }

    private CustomException invalidProfile() {
        return new CustomException(ErrorCode.REVIEW_AROMA_PROFILE_INVALID);
    }

    private record AromaRef(AromaType aromaType, String aromaKey) {}
    private record ValidatedItem(AromaType aromaType, String aromaKey, String labelSnapshot, Integer intensity) {}
    private record ValidatedProfile(AromaProfilePhase phase, List<ValidatedItem> items) {}
}
