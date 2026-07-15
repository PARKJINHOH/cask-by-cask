package com.caskbycask.domain.tastetree.service;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.tastetree.dto.*;
import com.caskbycask.domain.tastetree.dto.TasteTreeCompleteRequest.Answer;
import com.caskbycask.domain.tastetree.dto.TasteTreeContent.*;
import com.caskbycask.domain.tastetree.entity.*;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeVersionStatus;
import com.caskbycask.domain.tastetree.repository.*;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TasteTreeService {

    private static final int MAX_NODES = 100;
    private static final int MAX_OPTIONS = 8;
    private static final int MAX_RESULT_ITEMS = 3;
    private static final int MAX_TRAVERSAL = 120;

    private final TasteTreeRepository treeRepository;
    private final TasteTreeVersionRepository versionRepository;
    private final TasteTreeBookmarkRepository bookmarkRepository;
    private final TasteTreeResultRepository resultRepository;
    private final TasteTreeImageRepository imageRepository;
    private final UserRepository userRepository;
    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final ValidatedImageUploader validatedImageUploader;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<TasteTreeSummaryResponse> getOfficialTrees(Long userId) {
        return treeRepository.findAllByTypeWithOwner(TasteTreeType.OFFICIAL).stream()
                .map(tree -> latestPublished(tree.getId()).map(version -> toSummary(tree, version, userId)).orElse(null))
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public TasteTreeViewResponse getShared(String shareKey, Long userId) {
        TasteTree tree = findSharedTree(shareKey);
        TasteTreeVersion version = latestPublished(tree.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND));
        return toView(tree, version, userId, false);
    }

    @Transactional(readOnly = true)
    public TasteTreeViewResponse getMine(Long id, Long userId) {
        TasteTree tree = findOwnedTree(id, userId);
        TasteTreeVersion version = draft(tree.getId()).or(() -> latestPublished(tree.getId()))
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_VERSION_NOT_FOUND));
        return toView(tree, version, userId, true);
    }

    @Transactional(readOnly = true)
    public MyTasteTreesResponse getMyTrees(Long userId) {
        List<TasteTreeSummaryResponse> created = treeRepository.findAllOwnedBy(userId).stream()
                .map(tree -> draft(tree.getId()).or(() -> latestPublished(tree.getId()))
                        .map(version -> toSummary(tree, version, userId)).orElse(null))
                .filter(Objects::nonNull)
                .toList();
        List<TasteTreeSummaryResponse> saved = bookmarkRepository.findAllByUserIdWithTree(userId).stream()
                .map(bookmark -> latestPublished(bookmark.getTree().getId())
                        .map(version -> toSummary(bookmark.getTree(), version, userId)).orElse(null))
                .filter(Objects::nonNull)
                .toList();
        return new MyTasteTreesResponse(created, saved);
    }

    @Transactional
    public TasteTreeViewResponse create(TasteTreeSaveRequest request, Long userId) {
        validateDraftContent(request.content());
        User owner = userRepository.getByIdOrThrow(userId);
        TasteTree tree = treeRepository.save(TasteTree.builder()
                .type(TasteTreeType.USER)
                .owner(owner)
                .shareKey(generateTreeShareKey())
                .build());
        TasteTreeVersion version = versionRepository.save(TasteTreeVersion.builder()
                .tree(tree)
                .versionNumber(1)
                .status(TasteTreeVersionStatus.DRAFT)
                .title(trimRequired(request.title()))
                .description(trimToNull(request.description()))
                .contentJson(writeJson(request.content()))
                .build());
        return toView(tree, version, userId, true);
    }

    @Transactional
    public TasteTreeViewResponse saveDraft(Long id, TasteTreeSaveRequest request, Long userId) {
        validateDraftContent(request.content());
        TasteTree tree = findOwnedTree(id, userId);
        TasteTreeVersion version = draft(tree.getId()).orElseGet(() -> versionRepository.save(
                TasteTreeVersion.builder()
                        .tree(tree)
                        .versionNumber(versionRepository.findMaxVersionNumber(tree.getId()) + 1)
                        .status(TasteTreeVersionStatus.DRAFT)
                        .title(trimRequired(request.title()))
                        .description(trimToNull(request.description()))
                        .contentJson(writeJson(request.content()))
                        .build()));
        version.updateDraft(trimRequired(request.title()), trimToNull(request.description()), writeJson(request.content()));
        return toView(tree, version, userId, true);
    }

    @Transactional
    public TasteTreeViewResponse publish(Long id, Long userId) {
        TasteTree tree = findOwnedTree(id, userId);
        TasteTreeVersion draft = draft(tree.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_VERSION_NOT_FOUND));
        validateContent(readContent(draft), TasteTreeType.USER);
        latestPublished(tree.getId()).ifPresent(TasteTreeVersion::archive);
        draft.publish();
        return toView(tree, draft, userId, true);
    }

    @Transactional
    public TasteTreeViewResponse cloneTree(String shareKey, Long userId) {
        TasteTree source = findSharedTree(shareKey);
        TasteTreeVersion sourceVersion = latestPublished(source.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_VERSION_NOT_FOUND));
        User owner = userRepository.getByIdOrThrow(userId);
        TasteTree clone = treeRepository.save(TasteTree.builder()
                .type(TasteTreeType.USER)
                .owner(owner)
                .shareKey(generateTreeShareKey())
                .sourceTree(source)
                .build());
        TasteTreeVersion draft = versionRepository.save(TasteTreeVersion.builder()
                .tree(clone)
                .versionNumber(1)
                .status(TasteTreeVersionStatus.DRAFT)
                .title(truncate(sourceVersion.getTitle() + " 복사본", 120))
                .description(sourceVersion.getDescription())
                .contentJson(sourceVersion.getContentJson())
                .build());
        return toView(clone, draft, userId, true);
    }

    @Transactional
    public TasteTreeBookmarkResponse toggleBookmark(String shareKey, Long userId) {
        TasteTree tree = findSharedTree(shareKey);
        Optional<TasteTreeBookmark> existing = bookmarkRepository.findByTreeIdAndUserId(tree.getId(), userId);
        if (existing.isPresent()) {
            bookmarkRepository.delete(existing.get());
            return new TasteTreeBookmarkResponse(false);
        }
        bookmarkRepository.save(TasteTreeBookmark.builder()
                .tree(tree)
                .user(userRepository.getReferenceById(userId))
                .build());
        return new TasteTreeBookmarkResponse(true);
    }

    @Transactional
    public TasteTreeResultResponse complete(String shareKey, TasteTreeCompleteRequest request, Long userId) {
        TasteTree tree = findSharedTree(shareKey);
        TasteTreeVersion version = latestPublished(tree.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_VERSION_NOT_FOUND));
        TasteTreeContent content = readContent(version);
        ResolvedPath resolved = resolvePath(content, request.answers());
        List<TasteTreeResultItemSnapshot> items = resolveResultItems(resolved.resultNode());
        if (items.isEmpty() || items.size() > MAX_RESULT_ITEMS) {
            throw new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE);
        }

        TasteTreeResult result = resultRepository.save(TasteTreeResult.builder()
                .tree(tree)
                .version(version)
                .user(userId == null ? null : userRepository.getReferenceById(userId))
                .shareKey(generateResultShareKey())
                .pathJson(writeJson(resolved.path()))
                .itemsJson(writeJson(items))
                .build());
        return toResultResponse(result, content, resolved.path(), items);
    }

    @Transactional(readOnly = true)
    public TasteTreeResultResponse getResult(String shareKey) {
        TasteTreeResult result = resultRepository.findByShareKeyWithTreeAndVersion(shareKey)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_RESULT_NOT_FOUND));
        List<TasteTreePathSnapshot> path = readJson(result.getPathJson(), new TypeReference<>() {});
        List<TasteTreeResultItemSnapshot> items = readJson(result.getItemsJson(), new TypeReference<>() {});
        return toResultResponse(result, readContent(result.getVersion()), path, items);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        treeRepository.delete(findOwnedTree(id, userId));
    }

    @Transactional
    public TasteTreeImageUploadResponse uploadImage(MultipartFile file, Long userId) {
        StoredImage stored = validatedImageUploader.upload(file, "taste-tree");
        TasteTreeImage image = imageRepository.save(TasteTreeImage.builder()
                .uploadedBy(userRepository.getByIdOrThrow(userId))
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .subPath(stored.subPath())
                .build());
        return TasteTreeImageUploadResponse.from(image);
    }

    @Transactional(readOnly = true)
    public Optional<TasteTreeImageFile> findImageFile(String savedFileName) {
        return imageRepository.findBySavedFileName(savedFileName)
                .map(image -> new TasteTreeImageFile(image.getSavedFileName(), image.getSubPath(), image.getMimeType()));
    }

    private TasteTreeResultResponse toResultResponse(
            TasteTreeResult result,
            TasteTreeContent content,
            List<TasteTreePathSnapshot> path,
            List<TasteTreeResultItemSnapshot> items
    ) {
        TasteTree tree = result.getTree();
        TasteTreeVersion version = result.getVersion();
        boolean latest = latestPublished(tree.getId()).map(v -> v.getId().equals(version.getId())).orElse(false);
        TasteTreePathSnapshot destination = path.isEmpty() ? null : path.get(path.size() - 1);
        return new TasteTreeResultResponse(
                result.getId(), result.getShareKey(), tree.getId(), tree.getShareKey(), tree.getType(),
                version.getTitle(), version.getDescription(),
                destination == null ? version.getTitle() : destination.titleKo(),
                destination == null ? version.getTitle() : fallback(destination.titleEn(), destination.titleKo()),
                ownerNickname(tree), version.getId(),
                version.getVersionNumber(), latest, content, path, items, result.getCreatedAt());
    }

    private List<TasteTreeResultItemSnapshot> resolveResultItems(Node resultNode) {
        if (resultNode.dynamicFilter() != null) {
            return resolveDynamicItems(resultNode.dynamicFilter());
        }
        List<ResultItemDefinition> definitions = safeList(resultNode.results());
        Map<Long, Spirit> spirits = definitions.stream()
                .filter(item -> item.type() == ResultItemType.REGISTERED && item.spiritId() != null)
                .map(ResultItemDefinition::spiritId)
                .distinct()
                .map(id -> spiritRepository.findByIdAndStatus(id, SpiritStatus.ACTIVE)
                        .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND)))
                .collect(Collectors.toMap(Spirit::getId, Function.identity()));
        Map<Long, String> images = primaryImages(spirits.keySet());

        List<TasteTreeResultItemSnapshot> snapshots = new ArrayList<>();
        for (int i = 0; i < definitions.size(); i++) {
            ResultItemDefinition item = definitions.get(i);
            int score = 96 - (i * 6);
            if (item.type() == ResultItemType.REGISTERED) {
                Spirit spirit = spirits.get(item.spiritId());
                snapshots.add(toRegisteredSnapshot(spirit, images.get(spirit.getId()), score,
                        item.recommendationReasonKo(), item.recommendationReasonEn()));
            } else {
                snapshots.add(new TasteTreeResultItemSnapshot(
                        ResultItemType.CUSTOM, null, item.customName(), item.customName(), item.customImageUrl(),
                        null, null, item.priceAmount(), item.currencyCode(), score,
                        item.recommendationReasonKo(), item.recommendationReasonEn()));
            }
        }
        return snapshots;
    }

    private List<TasteTreeResultItemSnapshot> resolveDynamicItems(DynamicFilter filter) {
        List<WhiskyStyle> styles = safeList(filter.styles()).isEmpty()
                ? List.of(WhiskyStyle.values()) : filter.styles();
        String caskToken = trimToEmpty(filter.caskToken());
        List<Spirit> spirits = spiritRepository.findTasteTreeRecommendations(
                styles, filter.peated(), caskToken, filter.bottlingType(), filter.caskStrength(),
                filter.singleCask(), PageRequest.of(0, MAX_RESULT_ITEMS));
        if (spirits.isEmpty() && !caskToken.isEmpty()) {
            spirits = spiritRepository.findTasteTreeRecommendations(
                    styles, filter.peated(), "", filter.bottlingType(), filter.caskStrength(),
                    filter.singleCask(), PageRequest.of(0, MAX_RESULT_ITEMS));
        }
        Map<Long, String> images = primaryImages(spirits.stream().map(Spirit::getId).collect(Collectors.toSet()));
        List<TasteTreeResultItemSnapshot> result = new ArrayList<>();
        for (int i = 0; i < Math.min(MAX_RESULT_ITEMS, spirits.size()); i++) {
            Spirit spirit = spirits.get(i);
            result.add(toRegisteredSnapshot(spirit, images.get(spirit.getId()), 96 - (i * 6),
                    filter.recommendationReasonKo(), filter.recommendationReasonEn()));
        }
        return result;
    }

    private TasteTreeResultItemSnapshot toRegisteredSnapshot(
            Spirit spirit, String imageUrl, int score, String reasonKo, String reasonEn) {
        return new TasteTreeResultItemSnapshot(
                ResultItemType.REGISTERED, spirit.getId(), SpiritSlugUtils.displayNameKo(spirit),
                SpiritSlugUtils.displayNameEn(spirit), imageUrl, SpiritSlugUtils.canonicalPathKo(spirit),
                SpiritSlugUtils.canonicalPathEn(spirit), null, null, score, reasonKo, reasonEn);
    }

    private Map<Long, String> primaryImages(Collection<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(new ArrayList<>(ids)).stream()
                .collect(Collectors.toMap(image -> image.getSpirit().getId(), SpiritImage::getImageUrl, (a, b) -> a));
    }

    private ResolvedPath resolvePath(TasteTreeContent content, List<Answer> answers) {
        Map<String, Node> nodes = content.nodes().stream().collect(Collectors.toMap(Node::key, Function.identity()));
        Map<String, Answer> answerMap = answers.stream().collect(Collectors.toMap(Answer::nodeKey, Function.identity(), (a, b) -> a));
        Node current = content.nodes().stream().filter(node -> node.type() == NodeType.START).findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE));
        List<TasteTreePathSnapshot> path = new ArrayList<>();

        for (int guard = 0; guard < MAX_TRAVERSAL; guard++) {
            if (current.type() == NodeType.RESULT) {
                path.add(snapshot(current, List.of()));
                return new ResolvedPath(path, current);
            }
            if (current.type() == NodeType.START || current.type() == NodeType.INFO) {
                path.add(snapshot(current, List.of()));
                Option next = safeList(current.options()).stream().findFirst()
                        .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE));
                current = requireNode(nodes, next.targetNodeKey());
                continue;
            }

            Answer answer = answerMap.get(current.key());
            if (answer == null) throw new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE);
            List<Option> selected = safeList(current.options()).stream()
                    .filter(option -> answer.optionKeys().contains(option.key()))
                    .toList();
            int min = current.minSelect() == null ? 1 : current.minSelect();
            int max = current.maxSelect() == null ? 1 : current.maxSelect();
            if (selected.size() < min || selected.size() > max || selected.size() != new HashSet<>(answer.optionKeys()).size()) {
                throw new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE);
            }
            Set<String> targets = selected.stream().map(Option::targetNodeKey).collect(Collectors.toSet());
            if (targets.size() != 1) throw new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE);
            path.add(snapshot(current, selected));
            current = requireNode(nodes, targets.iterator().next());
        }
        throw new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE);
    }

    private TasteTreePathSnapshot snapshot(Node node, List<Option> selected) {
        return new TasteTreePathSnapshot(node.key(), node.titleKo(), node.titleEn(),
                selected.stream().map(Option::labelKo).toList(),
                selected.stream().map(option -> fallback(option.labelEn(), option.labelKo())).toList());
    }

    private void validateContent(TasteTreeContent content, TasteTreeType treeType) {
        if (content == null || content.nodes() == null || content.nodes().isEmpty() || content.nodes().size() > MAX_NODES) {
            invalidStructure();
        }
        List<Node> nodes = content.nodes();
        if (nodes.stream().filter(node -> node.type() == NodeType.START).count() != 1
                || nodes.stream().noneMatch(node -> node.type() == NodeType.RESULT)) {
            invalidStructure();
        }
        Map<String, Node> byKey = new HashMap<>();
        for (Node node : nodes) {
            if (!StringUtils.hasText(node.key()) || node.type() == null || !StringUtils.hasText(node.titleKo())
                    || byKey.put(node.key(), node) != null) {
                invalidStructure();
            }
        }
        for (Node node : nodes) {
            List<Option> options = safeList(node.options());
            if (options.size() > MAX_OPTIONS) invalidStructure();
            Set<String> optionKeys = new HashSet<>();
            for (Option option : options) {
                if (!StringUtils.hasText(option.key()) || !StringUtils.hasText(option.labelKo())
                        || !StringUtils.hasText(option.targetNodeKey()) || !byKey.containsKey(option.targetNodeKey())
                        || !optionKeys.add(option.key())) {
                    invalidStructure();
                }
            }
            if (node.type() == NodeType.QUESTION) {
                int min = node.minSelect() == null ? 1 : node.minSelect();
                int max = node.maxSelect() == null ? 1 : node.maxSelect();
                if (options.isEmpty() || min < 1 || max < min || max > options.size()) invalidStructure();
            }
            if (node.type() == NodeType.RESULT) {
                List<ResultItemDefinition> results = safeList(node.results());
                boolean dynamic = node.dynamicFilter() != null;
                if (treeType == TasteTreeType.USER && dynamic) invalidStructure();
                if (!dynamic && (results.isEmpty() || results.size() > MAX_RESULT_ITEMS)) invalidStructure();
                validateResultItems(results);
            }
        }
        validateReachability(nodes, byKey);
    }

    private void validateDraftContent(TasteTreeContent content) {
        if (content == null || content.nodes() == null || content.nodes().isEmpty() || content.nodes().size() > MAX_NODES) {
            invalidStructure();
        }
        if (content.nodes().stream().filter(node -> node.type() == NodeType.START).count() != 1) {
            invalidStructure();
        }
        Set<String> nodeKeys = new HashSet<>();
        for (Node node : content.nodes()) {
            if (node == null || node.type() == null || !StringUtils.hasText(node.key())
                    || !StringUtils.hasText(node.titleKo()) || !nodeKeys.add(node.key())
                    || safeList(node.options()).size() > MAX_OPTIONS || node.dynamicFilter() != null) {
                invalidStructure();
            }
            Set<String> optionKeys = new HashSet<>();
            for (Option option : safeList(node.options())) {
                if (option == null || !StringUtils.hasText(option.key()) || !optionKeys.add(option.key())) {
                    invalidStructure();
                }
            }
            if (safeList(node.results()).size() > MAX_RESULT_ITEMS) invalidStructure();
            for (ResultItemDefinition item : safeList(node.results())) {
                if (item == null || item.type() == null) invalidStructure();
                if (item.type() == ResultItemType.REGISTERED && item.spiritId() != null) {
                    spiritRepository.findByIdAndStatus(item.spiritId(), SpiritStatus.ACTIVE)
                            .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
                }
            }
        }
    }

    private void validateResultItems(List<ResultItemDefinition> items) {
        Set<Long> registeredIds = new HashSet<>();
        for (ResultItemDefinition item : items) {
            if (item == null || item.type() == null) invalidStructure();
            if (item.type() == ResultItemType.REGISTERED) {
                if (item.spiritId() == null || !registeredIds.add(item.spiritId())) invalidStructure();
                spiritRepository.findByIdAndStatus(item.spiritId(), SpiritStatus.ACTIVE)
                        .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
            } else if (!StringUtils.hasText(item.customName())) {
                invalidStructure();
            }
        }
    }

    private void validateReachability(List<Node> nodes, Map<String, Node> byKey) {
        Node start = nodes.stream().filter(node -> node.type() == NodeType.START).findFirst().orElseThrow();
        Set<String> visiting = new HashSet<>();
        Set<String> visited = new HashSet<>();
        walk(start, byKey, visiting, visited);
        if (visited.size() != nodes.size()) invalidStructure();
    }

    private void walk(Node node, Map<String, Node> byKey, Set<String> visiting, Set<String> visited) {
        if (visiting.contains(node.key())) invalidStructure();
        if (!visited.add(node.key())) return;
        visiting.add(node.key());
        for (Option option : safeList(node.options())) walk(requireNode(byKey, option.targetNodeKey()), byKey, visiting, visited);
        visiting.remove(node.key());
    }

    private TasteTreeViewResponse toView(
            TasteTree tree, TasteTreeVersion version, Long userId, boolean forceOwner) {
        return new TasteTreeViewResponse(
                tree.getId(), tree.getType(), tree.getShareKey(), ownerNickname(tree),
                forceOwner || (userId != null && tree.isOwnedBy(userId)),
                userId != null && bookmarkRepository.existsByTreeIdAndUserId(tree.getId(), userId),
                version.getId(), version.getVersionNumber(), version.getStatus(), version.getTitle(),
                version.getDescription(), readContent(version), draft(tree.getId()).isPresent(),
                tree.getCreatedAt(), version.getUpdatedAt());
    }

    private TasteTreeSummaryResponse toSummary(TasteTree tree, TasteTreeVersion version, Long userId) {
        TasteTreeContent content = readContent(version);
        Integer published = latestPublished(tree.getId()).map(TasteTreeVersion::getVersionNumber).orElse(null);
        return new TasteTreeSummaryResponse(
                tree.getId(), tree.getType(), tree.getShareKey(), ownerNickname(tree), version.getTitle(),
                version.getDescription(), content.experienceLevel(), published,
                userId != null && bookmarkRepository.existsByTreeIdAndUserId(tree.getId(), userId),
                draft(tree.getId()).isPresent(), version.getUpdatedAt());
    }

    private TasteTree findSharedTree(String shareKey) {
        return treeRepository.findByShareKeyWithOwner(shareKey)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND));
    }

    private TasteTree findOwnedTree(Long id, Long userId) {
        return treeRepository.findOwnedById(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_ACCESS_DENIED));
    }

    private Optional<TasteTreeVersion> latestPublished(Long treeId) {
        return versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                treeId, TasteTreeVersionStatus.PUBLISHED);
    }

    private Optional<TasteTreeVersion> draft(Long treeId) {
        return versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                treeId, TasteTreeVersionStatus.DRAFT);
    }

    private TasteTreeContent readContent(TasteTreeVersion version) {
        try {
            return objectMapper.readValue(version.getContentJson(), TasteTreeContent.class);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String generateTreeShareKey() {
        String key;
        do key = randomKey(); while (treeRepository.existsByShareKey(key));
        return key;
    }

    private String generateResultShareKey() {
        String key;
        do key = randomKey(); while (resultRepository.existsByShareKey(key));
        return key;
    }

    private String randomKey() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    private Node requireNode(Map<String, Node> nodes, String key) {
        Node node = nodes.get(key);
        if (node == null) invalidStructure();
        return node;
    }

    private String ownerNickname(TasteTree tree) {
        return tree.getOwner() == null ? null : tree.getOwner().getNickname();
    }

    private String trimRequired(String value) {
        if (!StringUtils.hasText(value)) throw new CustomException(ErrorCode.INVALID_INPUT);
        return value.trim();
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String trimToEmpty(String value) {
        return StringUtils.hasText(value) ? value.trim() : "";
    }

    private String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private String fallback(String primary, String fallback) {
        return StringUtils.hasText(primary) ? primary : fallback;
    }

    private <T> List<T> safeList(List<T> list) {
        return list == null ? List.of() : list;
    }

    private void invalidStructure() {
        throw new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE);
    }

    private record ResolvedPath(List<TasteTreePathSnapshot> path, Node resultNode) {}
}
