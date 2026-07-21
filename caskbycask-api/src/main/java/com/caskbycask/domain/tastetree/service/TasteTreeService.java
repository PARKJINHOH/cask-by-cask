package com.caskbycask.domain.tastetree.service;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.tastetree.dto.*;
import com.caskbycask.domain.tastetree.dto.TasteTreeContent.Edge;
import com.caskbycask.domain.tastetree.dto.TasteTreeContent.Node;
import com.caskbycask.domain.tastetree.dto.TasteTreeContent.NodeType;
import com.caskbycask.domain.tastetree.dto.TasteTreeContent.Whisky;
import com.caskbycask.domain.tastetree.dto.TasteTreeContent.WhiskySource;
import com.caskbycask.domain.tastetree.entity.*;
import com.caskbycask.domain.tastetree.entity.enums.*;
import com.caskbycask.domain.tastetree.repository.*;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.PageResponse;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TasteTreeService {

    private static final int SCHEMA_VERSION = 9;
    private static final int MIN_NODE_WIDTH = 180;
    private static final int MAX_NODE_WIDTH = 420;
    private static final int MIN_NODE_HEIGHT = 128;
    private static final int MAX_NODE_HEIGHT = 760;
    private static final int MAX_NODE_TITLE_LENGTH = 50;
    private static final int MAX_NODE_DESCRIPTION_LENGTH = 200;
    private static final int MAX_NODE_PROMPT_LENGTH = 120;
    private static final int MAX_FACTS = 70;
    private static final int MAX_FACT_LENGTH = 160;
    private static final int MAX_NODES = 150;
    private static final int MAX_EDGES = 400;
    private static final Set<String> SOURCE_HANDLES = Set.of(
            "source-left", "source-right", "source-bottom",
            "point-top", "point-left", "point-right", "point-bottom");
    private static final Set<String> TARGET_HANDLES = Set.of(
            "target-top", "target-left", "target-right",
            "point-top", "point-left", "point-right", "point-bottom");
    private static final Set<String> LINE_TYPES = Set.of("STRAIGHT", "STEP");

    private final TasteTreeRepository treeRepository;
    private final TasteTreeVersionRepository versionRepository;
    private final TasteTreeBookmarkRepository bookmarkRepository;
    private final TasteTreeLikeRepository likeRepository;
    private final TasteTreeDailyViewRepository dailyViewRepository;
    private final TasteTreeImageRepository imageRepository;
    private final TasteTreeFactRepository factRepository;
    private final UserRepository userRepository;
    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final ValidatedImageUploader validatedImageUploader;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<String> getFacts() {
        return factRepository.findAllByOrderByDisplayOrderAscIdAsc().stream()
                .map(TasteTreeFact::getContentKo)
                .toList();
    }

    @Transactional
    public List<String> updateFacts(TasteTreeFactsUpdateRequest request) {
        List<String> facts = request.factsKo().stream().map(String::trim).toList();
        if (facts.size() > MAX_FACTS
                || facts.stream().anyMatch(fact -> !StringUtils.hasText(fact) || fact.length() > MAX_FACT_LENGTH)
                || new HashSet<>(facts).size() != facts.size()) invalidStructure();

        factRepository.deleteAllInBatch();
        factRepository.flush();
        List<TasteTreeFact> entities = new ArrayList<>(facts.size());
        for (int index = 0; index < facts.size(); index++) {
            entities.add(TasteTreeFact.builder()
                    .contentKo(facts.get(index))
                    .displayOrder(index)
                    .build());
        }
        factRepository.saveAll(entities);
        return facts;
    }

    @Transactional(readOnly = true)
    public PageResponse<TasteTreeSummaryResponse> searchPublic(
            TasteTreeType type, String keyword, TasteTreeSort sort, int page, int size, Long userId) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        Sort pageSort = switch (sort == null ? TasteTreeSort.LATEST : sort) {
            case LIKES -> Sort.by(Sort.Order.desc("tree.likeCount"), Sort.Order.desc("publishedAt"), Sort.Order.desc("id"));
            case VIEWS -> Sort.by(Sort.Order.desc("tree.viewCount"), Sort.Order.desc("publishedAt"), Sort.Order.desc("id"));
            case LATEST -> Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("id"));
        };
        Page<TasteTreeVersion> versions = versionRepository.searchPublished(
                type, TasteTreeModerationStatus.VISIBLE, trimToEmpty(keyword),
                PageRequest.of(Math.max(page, 0), safeSize, pageSort));
        Set<Long> treeIds = versions.stream().map(v -> v.getTree().getId()).collect(Collectors.toSet());
        Set<Long> bookmarked = userId == null || treeIds.isEmpty() ? Set.of()
                : new HashSet<>(bookmarkRepository.findTreeIdsByUserIdAndTreeIdIn(userId, new ArrayList<>(treeIds)));
        Set<Long> liked = userId == null || treeIds.isEmpty() ? Set.of()
                : new HashSet<>(likeRepository.findTreeIdsByUserIdAndTreeIdIn(userId, new ArrayList<>(treeIds)));
        return PageResponse.from(versions.map(version -> toSummary(
                version.getTree(), version, userId, bookmarked.contains(version.getTree().getId()),
                liked.contains(version.getTree().getId()), version.getVersionNumber(), false)));
    }

    @Transactional(readOnly = true)
    public List<TasteTreeSummaryResponse> getOfficialTrees(Long userId) {
        return searchPublic(TasteTreeType.OFFICIAL, "", TasteTreeSort.LATEST, 0, 50, userId).content();
    }

    @Transactional(readOnly = true)
    public TasteTreeViewResponse getShared(String shareKey, Long userId) {
        TasteTree tree = findPublicTree(shareKey);
        TasteTreeVersion version = latestPublished(tree.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND));
        return toView(tree, version, userId, false);
    }

    @Transactional(readOnly = true)
    public TasteTreeViewResponse getMine(Long id, Long userId) {
        TasteTree tree = findOwnedTree(id, userId);
        TasteTreeVersion version = editableVersion(tree);
        return toView(tree, version, userId, true);
    }

    @Transactional(readOnly = true)
    public MyTasteTreesResponse getMyTrees(Long userId) {
        List<TasteTree> createdTrees = treeRepository.findAllOwnedBy(userId);
        Map<Long, List<TasteTreeVersion>> versions = versionsByTree(createdTrees);
        Set<Long> createdLiked = likedTreeIds(userId, createdTrees);
        List<TasteTreeSummaryResponse> created = createdTrees.stream()
                .map(tree -> preferredVersion(versions.get(tree.getId()))
                        .map(version -> toSummary(tree, version, userId, false,
                                createdLiked.contains(tree.getId()), publishedVersion(versions.get(tree.getId())),
                                hasDraft(versions.get(tree.getId()))))
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();

        List<TasteTree> savedTrees = bookmarkRepository.findAllByUserIdWithTree(userId).stream()
                .map(TasteTreeBookmark::getTree)
                .filter(tree -> tree.getModerationStatus() == TasteTreeModerationStatus.VISIBLE)
                .toList();
        Map<Long, List<TasteTreeVersion>> savedVersions = versionsByTree(savedTrees);
        Set<Long> savedLiked = likedTreeIds(userId, savedTrees);
        List<TasteTreeSummaryResponse> saved = savedTrees.stream()
                .map(tree -> latestPublished(savedVersions.get(tree.getId()))
                        .map(version -> toSummary(tree, version, userId, true,
                                savedLiked.contains(tree.getId()), version.getVersionNumber(), false))
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();
        return new MyTasteTreesResponse(created, saved);
    }

    @Transactional
    public TasteTreeViewResponse create(TasteTreeSaveRequest request, Long userId) {
        return createTree(request, userId, TasteTreeType.USER);
    }

    @Transactional
    public TasteTreeViewResponse createOfficial(TasteTreeSaveRequest request, Long adminId) {
        return createTree(request, adminId, TasteTreeType.OFFICIAL);
    }

    private TasteTreeViewResponse createTree(TasteTreeSaveRequest request, Long creatorId, TasteTreeType type) {
        validateDraftContent(request.content());
        User creator = userRepository.getByIdOrThrow(creatorId);
        TasteTree tree = treeRepository.save(TasteTree.builder()
                .type(type)
                .owner(type == TasteTreeType.USER ? creator : null)
                .createdBy(creator)
                .shareKey(generateTreeShareKey())
                .moderationStatus(TasteTreeModerationStatus.VISIBLE)
                .build());
        TasteTreeVersion version = versionRepository.save(TasteTreeVersion.builder()
                .tree(tree)
                .versionNumber(1)
                .status(TasteTreeVersionStatus.DRAFT)
                .title(trimRequired(request.title()))
                .description(trimToNull(request.description()))
                .contentJson(writeJson(normalize(request.content())))
                .build());
        return toView(tree, version, creatorId, true);
    }

    @Transactional
    public TasteTreeViewResponse saveDraft(Long id, TasteTreeSaveRequest request, Long userId) {
        return saveDraft(findOwnedTree(id, userId), request, userId);
    }

    @Transactional
    public TasteTreeViewResponse saveOfficialDraft(Long id, TasteTreeSaveRequest request, Long adminId) {
        TasteTree tree = findAnyTree(id);
        if (tree.getType() != TasteTreeType.OFFICIAL) throw new CustomException(ErrorCode.TASTE_TREE_ACCESS_DENIED);
        return saveDraft(tree, request, adminId);
    }

    private TasteTreeViewResponse saveDraft(TasteTree tree, TasteTreeSaveRequest request, Long actorId) {
        validateDraftContent(request.content());
        TasteTreeVersion version = draft(tree.getId()).orElseGet(() -> versionRepository.save(
                TasteTreeVersion.builder()
                        .tree(tree)
                        .versionNumber(versionRepository.findMaxVersionNumber(tree.getId()) + 1)
                        .status(TasteTreeVersionStatus.DRAFT)
                        .title(trimRequired(request.title()))
                        .description(trimToNull(request.description()))
                        .contentJson(writeJson(normalize(request.content())))
                        .build()));
        version.updateDraft(trimRequired(request.title()), trimToNull(request.description()),
                writeJson(normalize(request.content())));
        return toView(tree, version, actorId, true);
    }

    @Transactional
    public TasteTreeViewResponse publish(Long id, Long userId) {
        return publish(findOwnedTree(id, userId), userId);
    }

    @Transactional
    public TasteTreeViewResponse publishOfficial(Long id, Long adminId) {
        TasteTree tree = findAnyTree(id);
        if (tree.getType() != TasteTreeType.OFFICIAL) throw new CustomException(ErrorCode.TASTE_TREE_ACCESS_DENIED);
        return publish(tree, adminId);
    }

    private TasteTreeViewResponse publish(TasteTree tree, Long actorId) {
        TasteTreeVersion draft = draft(tree.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_VERSION_NOT_FOUND));
        validatePublishedContent(readContent(draft));
        latestPublished(tree.getId()).ifPresent(TasteTreeVersion::archive);
        draft.publish();
        return toView(tree, draft, actorId, true);
    }

    @Transactional
    public TasteTreeBookmarkResponse toggleBookmark(String shareKey, Long userId) {
        TasteTree tree = findPublicTree(shareKey);
        Optional<TasteTreeBookmark> existing = bookmarkRepository.findByTreeIdAndUserId(tree.getId(), userId);
        if (existing.isPresent()) {
            bookmarkRepository.delete(existing.get());
            return new TasteTreeBookmarkResponse(false);
        }
        bookmarkRepository.save(TasteTreeBookmark.builder()
                .tree(tree).user(userRepository.getReferenceById(userId)).build());
        return new TasteTreeBookmarkResponse(true);
    }

    @Transactional
    public TasteTreeEngagementResponse like(String shareKey, Long userId) {
        TasteTree tree = lockPublicTree(shareKey);
        ensureCanLike(tree, userId);
        if (!likeRepository.existsByTreeIdAndUserId(tree.getId(), userId)) {
            likeRepository.save(TasteTreeLike.builder()
                    .tree(tree).user(userRepository.getReferenceById(userId)).build());
            tree.increaseLikeCount();
        }
        return engagement(tree, true);
    }

    @Transactional
    public TasteTreeEngagementResponse unlike(String shareKey, Long userId) {
        TasteTree tree = lockPublicTree(shareKey);
        Optional<TasteTreeLike> like = likeRepository.findByTreeIdAndUserId(tree.getId(), userId);
        if (like.isPresent()) {
            likeRepository.delete(like.get());
            tree.decreaseLikeCount();
        }
        return engagement(tree, false);
    }

    @Transactional
    public TasteTreeEngagementResponse recordView(String shareKey, Long userId, String anonymousViewerId) {
        TasteTree tree = lockPublicTree(shareKey);
        String viewerKey = userId == null ? "guest:" + anonymousViewerId : "user:" + userId;
        String hash = sha256(viewerKey);
        LocalDate today = LocalDate.now();
        if (!dailyViewRepository.existsByTreeIdAndViewerKeyHashAndViewedDate(tree.getId(), hash, today)) {
            dailyViewRepository.save(TasteTreeDailyView.builder()
                    .tree(tree).viewerKeyHash(hash).viewedDate(today).build());
            tree.increaseViewCount();
        }
        boolean liked = userId != null && likeRepository.existsByTreeIdAndUserId(tree.getId(), userId);
        return engagement(tree, liked);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        deleteTree(findOwnedTree(id, userId));
    }

    @Transactional
    public void deleteAdmin(Long id) {
        deleteTree(findAnyTree(id));
    }

    private void deleteTree(TasteTree tree) {
        Long treeId = tree.getId();
        List<TasteTreeImageFile> imageFiles = imageRepository.findFilesByTreeId(treeId);
        imageRepository.deleteAllByTreeId(treeId);
        treeRepository.deleteById(treeId);
        deleteFilesAfterCommit(imageFiles);
    }

    @Transactional
    public void hideAdmin(Long id) {
        findAnyTree(id).hide();
    }

    @Transactional
    public void restoreAdmin(Long id) {
        findAnyTree(id).restore();
    }

    @Transactional(readOnly = true)
    public List<TasteTreeSummaryResponse> getAdminTrees() {
        List<TasteTree> trees = treeRepository.findAllWithOwner();
        Map<Long, List<TasteTreeVersion>> versions = versionsByTree(trees);
        return trees.stream().map(tree -> preferredVersion(versions.get(tree.getId()))
                        .map(version -> toSummary(tree, version, null, false, false,
                                publishedVersion(versions.get(tree.getId())), hasDraft(versions.get(tree.getId()))))
                        .orElse(null))
                .filter(Objects::nonNull).toList();
    }

    @Transactional(readOnly = true)
    public TasteTreeViewResponse getAdmin(Long id, Long adminId) {
        TasteTree tree = findAnyTree(id);
        return toView(tree, editableVersion(tree), adminId, true);
    }

    @Transactional
    public TasteTreeImageUploadResponse uploadImage(MultipartFile file, Long treeId, Long userId, boolean admin) {
        TasteTree tree = admin ? findAnyTree(treeId) : findOwnedTree(treeId, userId);
        StoredImage stored = validatedImageUploader.upload(file, "taste-tree");
        TasteTreeImage image = TasteTreeImage.builder()
                .tree(tree)
                .uploadedBy(userRepository.getReferenceById(userId))
                .originalFileName(file.getOriginalFilename())
                .savedFileName(stored.savedFileName())
                .fileSize(file.getSize())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .subPath(stored.subPath())
                .build();
        return TasteTreeImageUploadResponse.from(imageRepository.save(image));
    }

    @Transactional(readOnly = true)
    public Optional<TasteTreeImageFile> findImageFile(String savedFileName) {
        return imageRepository.findBySavedFileName(savedFileName)
                .map(image -> new TasteTreeImageFile(image.getSavedFileName(), image.getSubPath(), image.getMimeType()));
    }

    @Transactional
    public int cleanupOldViews() {
        return dailyViewRepository.deleteBefore(LocalDate.now().minusDays(2));
    }

    private TasteTreeContent hydrateContent(TasteTreeContent content) {
        content = normalize(content);
        Set<Long> ids = safeNodes(content).stream()
                .map(Node::whisky).filter(Objects::nonNull)
                .filter(whisky -> whisky.source() == WhiskySource.REGISTERED && whisky.spiritId() != null)
                .map(Whisky::spiritId).collect(Collectors.toSet());
        if (ids.isEmpty()) return content;
        Map<Long, Spirit> spirits = spiritRepository.findAllById(ids).stream()
                .filter(spirit -> spirit.getStatus() == SpiritStatus.ACTIVE)
                .collect(Collectors.toMap(Spirit::getId, Function.identity()));
        Map<Long, String> images = spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(new ArrayList<>(ids)).stream()
                .collect(Collectors.toMap(image -> image.getSpirit().getId(), image -> image.getImageUrl(), (a, b) -> a));
        List<Node> nodes = safeNodes(content).stream().map(node -> {
            Whisky whisky = node.whisky();
            if (whisky == null || whisky.source() != WhiskySource.REGISTERED) return node;
            Spirit spirit = spirits.get(whisky.spiritId());
            if (spirit == null) return node;
            Whisky hydrated = new Whisky(WhiskySource.REGISTERED, spirit.getId(), spirit.getNameKo(), spirit.getNameEn(),
                    images.get(spirit.getId()), whisky.imageOverrideUrl(), whisky.priceAmount(), whisky.currencyCode(), whisky.priceText(),
                    whisky.noteKo(), whisky.noteEn());
            return new Node(node.key(), node.type(), node.titleKo(), node.titleEn(), node.descriptionKo(),
                    node.descriptionEn(), node.promptKo(), node.promptEn(), node.positionX(), node.positionY(), node.width(), node.height(), node.imageUrl(), node.imageFit(),
                    node.imagePositionX(), node.imagePositionY(), node.imageScale(), node.imageHidden(), hydrated);
        }).toList();
        return new TasteTreeContent(SCHEMA_VERSION, nodes, safeEdges(content), null);
    }

    private void validateDraftContent(TasteTreeContent content) {
        if (content == null || safeNodes(content).isEmpty() || safeNodes(content).size() > MAX_NODES
                || safeEdges(content).size() > MAX_EDGES) invalidStructure();
        Set<String> nodeKeys = new HashSet<>();
        for (Node node : safeNodes(content)) {
            if (node == null || !StringUtils.hasText(node.key()) || node.type() == null
                    || !StringUtils.hasText(node.titleKo()) || !nodeKeys.add(node.key())
                    || node.titleKo().length() > MAX_NODE_TITLE_LENGTH
                    || (node.titleEn() != null && node.titleEn().length() > MAX_NODE_TITLE_LENGTH)
                    || (node.descriptionKo() != null && node.descriptionKo().length() > MAX_NODE_DESCRIPTION_LENGTH)
                    || (node.descriptionEn() != null && node.descriptionEn().length() > MAX_NODE_DESCRIPTION_LENGTH)
                    || (node.promptKo() != null && node.promptKo().length() > MAX_NODE_PROMPT_LENGTH)
                    || (node.promptEn() != null && node.promptEn().length() > MAX_NODE_PROMPT_LENGTH)
                    || (node.width() != null && (node.width() < MIN_NODE_WIDTH || node.width() > MAX_NODE_WIDTH))
                    || (node.height() != null && (node.height() < MIN_NODE_HEIGHT || node.height() > MAX_NODE_HEIGHT))
                    || (node.imagePositionX() != null && (node.imagePositionX() < 0 || node.imagePositionX() > 100))
                    || (node.imagePositionY() != null && (node.imagePositionY() < 0 || node.imagePositionY() > 100))
                    || (node.imageScale() != null && (node.imageScale() < 50 || node.imageScale() > 250))) invalidStructure();
        }
        Set<String> edgeKeys = new HashSet<>();
        for (Edge edge : safeEdges(content)) {
            if (edge == null || !StringUtils.hasText(edge.key()) || !edgeKeys.add(edge.key())
                    || !StringUtils.hasText(edge.sourceNodeKey()) || !StringUtils.hasText(edge.targetNodeKey())
                    || edge.sourceNodeKey().equals(edge.targetNodeKey())
                    || !nodeKeys.contains(edge.sourceNodeKey()) || !nodeKeys.contains(edge.targetNodeKey())
                    || (edge.descriptionKo() != null && edge.descriptionKo().length() > 300)
                    || (edge.descriptionEn() != null && edge.descriptionEn().length() > 300)
                    || (edge.sourceHandle() != null && !SOURCE_HANDLES.contains(edge.sourceHandle()))
                    || (edge.targetHandle() != null && !TARGET_HANDLES.contains(edge.targetHandle()))
                    || (edge.labelPosition() != null && (edge.labelPosition() < 0.08 || edge.labelPosition() > 0.92))
                    || (edge.lineType() != null && !LINE_TYPES.contains(edge.lineType()))) invalidStructure();
        }
    }

    private void validatePublishedContent(TasteTreeContent content) {
        validateDraftContent(content);
        List<Node> nodes = safeNodes(content);
        if (nodes.stream().filter(node -> node.type() == NodeType.START).count() != 1) invalidStructure();
        Node start = nodes.stream().filter(node -> node.type() == NodeType.START).findFirst().orElseThrow();
        Map<String, Node> byKey = nodes.stream().collect(Collectors.toMap(Node::key, Function.identity()));
        Map<String, List<String>> adjacency = new HashMap<>();
        Set<String> pairs = new HashSet<>();
        for (Edge edge : safeEdges(content)) {
            if (!pairs.add(edge.sourceNodeKey() + "->" + edge.targetNodeKey())) invalidStructure();
            if (!StringUtils.hasText(edge.labelKo())) invalidStructure();
            if (byKey.get(edge.sourceNodeKey()).type() == NodeType.START && "point-top".equals(edge.sourceHandle())) invalidStructure();
            adjacency.computeIfAbsent(edge.sourceNodeKey(), ignored -> new ArrayList<>()).add(edge.targetNodeKey());
        }
        Set<String> visited = new HashSet<>();
        walkAcyclic(start.key(), adjacency, new HashSet<>(), visited);
        if (visited.size() != byKey.size()) invalidStructure();
        if (nodes.stream().noneMatch(node -> node.type() != NodeType.START)) invalidStructure();
        for (Node node : nodes) {
            if (node.type() != NodeType.START && node.type() != NodeType.WHISKY && node.type() != NodeType.CHOICE) invalidStructure();
            boolean hasOutgoing = !adjacency.getOrDefault(node.key(), List.of()).isEmpty();
            if (node.type() == NodeType.CHOICE && (node.whisky() != null || !hasOutgoing)) invalidStructure();
            if (node.type() != NodeType.CHOICE && hasOutgoing && !StringUtils.hasText(node.promptKo())) invalidStructure();
        }
        validateWhiskies(nodes);
    }

    private void walkAcyclic(String key, Map<String, List<String>> adjacency, Set<String> visiting, Set<String> visited) {
        if (!visiting.add(key)) invalidStructure();
        if (visited.add(key)) {
            for (String next : adjacency.getOrDefault(key, List.of())) walkAcyclic(next, adjacency, visiting, visited);
        }
        visiting.remove(key);
    }

    private void validateWhiskies(List<Node> nodes) {
        Set<Long> registeredIds = nodes.stream().map(Node::whisky).filter(Objects::nonNull)
                .filter(w -> w.source() == WhiskySource.REGISTERED && w.spiritId() != null)
                .map(Whisky::spiritId).collect(Collectors.toSet());
        Map<Long, Spirit> spirits = spiritRepository.findAllById(registeredIds).stream()
                .collect(Collectors.toMap(Spirit::getId, Function.identity()));
        for (Node node : nodes) {
            Whisky whisky = node.whisky();
            if (whisky == null) {
                if (node.type() == NodeType.WHISKY) invalidStructure();
                continue;
            }
            if (whisky.source() == null) invalidStructure();
            if (whisky.source() == WhiskySource.REGISTERED) {
                Spirit spirit = spirits.get(whisky.spiritId());
                if (spirit == null || spirit.getStatus() != SpiritStatus.ACTIVE) invalidStructure();
            }
            if (whisky.priceText() != null && whisky.priceText().length() > 50) invalidStructure();
        }
    }

    private TasteTreeContent normalize(TasteTreeContent content) {
        List<Edge> edges = safeEdges(content);
        Set<String> sourceKeys = edges.stream().map(Edge::sourceNodeKey).collect(Collectors.toSet());
        List<Node> nodes = safeNodes(content).stream().map(node -> {
            boolean acceptsPrompt = node.type() != NodeType.CHOICE && sourceKeys.contains(node.key());
            return new Node(node.key(), node.type(), node.titleKo(), node.titleEn(), node.descriptionKo(),
                    node.descriptionEn(), acceptsPrompt ? trimToNull(node.promptKo()) : null,
                    acceptsPrompt ? trimToNull(node.promptEn()) : null,
                    node.positionX(), node.positionY(), node.width(), node.height(), node.imageUrl(), node.imageFit(),
                    node.imagePositionX(), node.imagePositionY(), node.imageScale(), node.imageHidden(), node.whisky());
        }).toList();
        return new TasteTreeContent(SCHEMA_VERSION, nodes, edges, null);
    }

    private List<Node> safeNodes(TasteTreeContent content) {
        return content == null || content.nodes() == null ? List.of() : content.nodes();
    }

    private List<Edge> safeEdges(TasteTreeContent content) {
        return content == null || content.edges() == null ? List.of() : content.edges();
    }

    private TasteTreeSummaryResponse toSummary(TasteTree tree, TasteTreeVersion version, Long userId,
                                                boolean bookmarked, boolean liked, Integer publishedVersion,
                                                boolean hasDraft) {
        return new TasteTreeSummaryResponse(
                tree.getId(), tree.getType(), tree.getShareKey(), ownerNickname(tree), version.getTitle(),
                version.getDescription(), publishedVersion,
                bookmarked, liked, canLike(tree, userId), tree.getLikeCount(), tree.getViewCount(),
                tree.getModerationStatus(), hasDraft, version.getUpdatedAt());
    }

    private TasteTreeViewResponse toView(TasteTree tree, TasteTreeVersion version, Long userId, boolean editable) {
        boolean bookmarked = userId != null && bookmarkRepository.existsByTreeIdAndUserId(tree.getId(), userId);
        boolean liked = userId != null && likeRepository.existsByTreeIdAndUserId(tree.getId(), userId);
        return new TasteTreeViewResponse(
                tree.getId(), tree.getType(), tree.getShareKey(), ownerNickname(tree), editable,
                bookmarked, liked, canLike(tree, userId), tree.getLikeCount(), tree.getViewCount(),
                tree.getModerationStatus(), version.getId(), version.getVersionNumber(), version.getStatus(),
                version.getTitle(), version.getDescription(), hydrateContent(readContent(version)),
                draft(tree.getId()).isPresent(), tree.getCreatedAt(), tree.getUpdatedAt());
    }

    private Map<Long, List<TasteTreeVersion>> versionsByTree(List<TasteTree> trees) {
        if (trees.isEmpty()) return Map.of();
        return versionRepository.findAllByTreeIdInOrderByTreeIdAscVersionNumberDesc(
                        trees.stream().map(TasteTree::getId).toList()).stream()
                .collect(Collectors.groupingBy(version -> version.getTree().getId()));
    }

    private Optional<TasteTreeVersion> preferredVersion(List<TasteTreeVersion> versions) {
        if (versions == null) return Optional.empty();
        return versions.stream().filter(v -> v.getStatus() == TasteTreeVersionStatus.DRAFT).findFirst()
                .or(() -> versions.stream().filter(v -> v.getStatus() == TasteTreeVersionStatus.PUBLISHED).findFirst());
    }

    private Optional<TasteTreeVersion> latestPublished(List<TasteTreeVersion> versions) {
        if (versions == null) return Optional.empty();
        return versions.stream().filter(v -> v.getStatus() == TasteTreeVersionStatus.PUBLISHED).findFirst();
    }

    private Integer publishedVersion(List<TasteTreeVersion> versions) {
        return latestPublished(versions).map(TasteTreeVersion::getVersionNumber).orElse(null);
    }

    private boolean hasDraft(List<TasteTreeVersion> versions) {
        return versions != null && versions.stream().anyMatch(v -> v.getStatus() == TasteTreeVersionStatus.DRAFT);
    }

    private Set<Long> likedTreeIds(Long userId, List<TasteTree> trees) {
        if (trees.isEmpty()) return Set.of();
        return new HashSet<>(likeRepository.findTreeIdsByUserIdAndTreeIdIn(
                userId, trees.stream().map(TasteTree::getId).toList()));
    }

    private TasteTreeVersion editableVersion(TasteTree tree) {
        return draft(tree.getId()).or(() -> latestPublished(tree.getId()))
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_VERSION_NOT_FOUND));
    }

    private Optional<TasteTreeVersion> latestPublished(Long treeId) {
        return versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(treeId, TasteTreeVersionStatus.PUBLISHED);
    }

    private Optional<TasteTreeVersion> draft(Long treeId) {
        return versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(treeId, TasteTreeVersionStatus.DRAFT);
    }

    private TasteTree findOwnedTree(Long id, Long userId) {
        return treeRepository.findOwnedById(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_ACCESS_DENIED));
    }

    private TasteTree findAnyTree(Long id) {
        return treeRepository.findByIdWithOwner(id)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND));
    }

    private TasteTree findPublicTree(String shareKey) {
        TasteTree tree = treeRepository.findByShareKeyWithOwner(shareKey)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND));
        if (tree.getModerationStatus() != TasteTreeModerationStatus.VISIBLE || latestPublished(tree.getId()).isEmpty()) {
            throw new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND);
        }
        return tree;
    }

    private TasteTree lockPublicTree(String shareKey) {
        TasteTree tree = treeRepository.findByShareKeyForUpdate(shareKey)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND));
        if (tree.getModerationStatus() != TasteTreeModerationStatus.VISIBLE || latestPublished(tree.getId()).isEmpty()) {
            throw new CustomException(ErrorCode.TASTE_TREE_NOT_FOUND);
        }
        return tree;
    }

    private void ensureCanLike(TasteTree tree, Long userId) {
        if (!canLike(tree, userId)) throw new CustomException(ErrorCode.TASTE_TREE_ACCESS_DENIED);
    }

    private boolean canLike(TasteTree tree, Long userId) {
        return userId != null && !tree.isOwnedBy(userId) && !tree.isCreatedBy(userId);
    }

    private TasteTreeEngagementResponse engagement(TasteTree tree, boolean liked) {
        return new TasteTreeEngagementResponse(liked, tree.getLikeCount(), tree.getViewCount());
    }

    private String ownerNickname(TasteTree tree) {
        return tree.getOwner() == null ? null : tree.getOwner().getNickname();
    }

    private TasteTreeContent readContent(TasteTreeVersion version) {
        try {
            return objectMapper.readValue(version.getContentJson(), TasteTreeContent.class);
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
        do key = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        while (treeRepository.existsByShareKey(key));
        return key;
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private void deleteFilesAfterCommit(List<TasteTreeImageFile> images) {
        if (images.isEmpty()) return;
        Runnable delete = () -> images.forEach(image -> fileStorageService.delete(image.savedFileName(), image.subPath()));
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            delete.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { delete.run(); }
        });
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

    private void invalidStructure() {
        throw new CustomException(ErrorCode.TASTE_TREE_INVALID_STRUCTURE);
    }
}
