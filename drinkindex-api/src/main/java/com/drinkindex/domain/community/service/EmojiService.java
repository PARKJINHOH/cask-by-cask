package com.drinkindex.domain.community.service;

import com.drinkindex.domain.comment.repository.CommentRepository;
import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.CommentEmojiReaction;
import com.drinkindex.domain.community.entity.CommunityEmoji;
import com.drinkindex.domain.community.entity.EmojiGroup;
import com.drinkindex.domain.community.entity.enums.EmojiTargetType;
import com.drinkindex.domain.community.repository.CommentEmojiReactionRepository;
import com.drinkindex.domain.community.repository.CommunityEmojiRepository;
import com.drinkindex.domain.community.repository.EmojiGroupRepository;
import com.drinkindex.domain.community.repository.PostCommentRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.FileStorageService;
import com.drinkindex.global.util.NoticeImageValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmojiService {

    private final CommunityEmojiRepository emojiRepository;
    private final EmojiGroupRepository groupRepository;
    private final CommentEmojiReactionRepository reactionRepository;
    private final PostCommentRepository commentRepository;
    // [패치 13] 술 상세 커뮤니티 댓글 존재 검증용
    private final CommentRepository spiritCommentRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NoticeImageValidator imageValidator;

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<EmojiResponse> getActiveEmojis() {
        return emojiRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(EmojiResponse::from)
                .collect(Collectors.toList());
    }

    // [패치 13] 게시판 댓글 이모지 반응 토글 (POST_COMMENT)
    @Transactional
    public EmojiReactionToggleResponse toggleReaction(Long commentId, Long emojiId, Long userId) {
        return toggleReaction(EmojiTargetType.POST_COMMENT, commentId, emojiId, userId);
    }

    // [패치 13] 다형성 이모지 반응 토글 — POST_COMMENT / SPIRIT_COMMENT 공통 처리
    @Transactional
    public EmojiReactionToggleResponse toggleReaction(EmojiTargetType targetType, Long targetId,
                                                      Long emojiId, Long userId) {
        validateTargetExists(targetType, targetId);

        CommunityEmoji emoji = emojiRepository.findById(emojiId)
                .orElseThrow(() -> new CustomException(ErrorCode.EMOJI_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        reactionRepository.findByTargetTypeAndTargetIdAndEmojiIdAndUserId(targetType, targetId, emojiId, userId)
                .ifPresentOrElse(
                        reactionRepository::delete,
                        () -> {
                            CommentEmojiReaction reaction = CommentEmojiReaction.builder()
                                    .targetType(targetType).targetId(targetId)
                                    .emoji(emoji).user(user).build();
                            reactionRepository.save(reaction);
                        }
                );

        long count = reactionRepository.countByTargetTypeAndTargetIdAndEmojiId(targetType, targetId, emojiId);
        boolean isMyReaction = reactionRepository
                .findByTargetTypeAndTargetIdAndEmojiIdAndUserId(targetType, targetId, emojiId, userId).isPresent();

        return new EmojiReactionToggleResponse(emojiId, count, isMyReaction);
    }

    private void validateTargetExists(EmojiTargetType targetType, Long targetId) {
        boolean exists = switch (targetType) {
            case POST_COMMENT -> commentRepository.existsById(targetId);
            case SPIRIT_COMMENT -> spiritCommentRepository.existsById(targetId);
        };
        if (!exists) {
            throw new CustomException(ErrorCode.COMMENT_NOT_FOUND);
        }
    }

    // ═══════════════════════════════════════════
    // 관리자 — 이모지 그룹
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<EmojiGroupAdminResponse> getAllGroups() {
        return groupRepository.findAllByOrderBySortOrderAsc().stream()
                .map(EmojiGroupAdminResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public EmojiGroupAdminResponse createGroup(CreateEmojiGroupRequest request) {
        int nextOrder = groupRepository.findAllByOrderBySortOrderAsc().size();
        EmojiGroup group = EmojiGroup.builder()
                .name(request.getName())
                .sortOrder(nextOrder)
                .build();
        return EmojiGroupAdminResponse.from(groupRepository.save(group));
    }

    @Transactional
    public EmojiGroupAdminResponse updateGroup(Long id, CreateEmojiGroupRequest request) {
        EmojiGroup group = findGroup(id);
        group.update(request.getName());
        return EmojiGroupAdminResponse.from(group);
    }

    @Transactional
    public void deleteGroup(Long id) {
        EmojiGroup group = findGroup(id);
        if (!emojiRepository.findByGroupIdOrderBySortOrderAsc(id).isEmpty()) {
            throw new CustomException(ErrorCode.EMOJI_GROUP_IN_USE);
        }
        groupRepository.delete(group);
    }

    @Transactional
    public void reorderGroups(List<Long> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            EmojiGroup group = findGroup(orderedIds.get(i));
            group.updateSortOrder(i);
        }
    }

    // ═══════════════════════════════════════════
    // 관리자 — 이모지
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<EmojiAdminResponse> getAll(int page, int size) {
        return emojiRepository.findAllByOrderBySortOrderAsc(PageRequest.of(page, size))
                .map(EmojiAdminResponse::from);
    }

    @Transactional(readOnly = true)
    public List<EmojiAdminResponse> getByGroup(Long groupId) {
        List<CommunityEmoji> emojis = groupId == null
                ? emojiRepository.findByGroupIsNullOrderBySortOrderAsc()
                : emojiRepository.findByGroupIdOrderBySortOrderAsc(groupId);
        return emojis.stream().map(EmojiAdminResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public EmojiAdminResponse create(CreateEmojiRequest request) {
        if (!StringUtils.hasText(request.getUnicode()) && !StringUtils.hasText(request.getImageUrl())) {
            throw new CustomException(ErrorCode.EMOJI_UNICODE_OR_IMAGE_REQUIRED);
        }

        String code = StringUtils.hasText(request.getUnicode())
                ? request.getUnicode()
                : "img-" + UUID.randomUUID().toString().substring(0, 8);

        if (emojiRepository.existsByCode(code)) {
            throw new CustomException(ErrorCode.DUPLICATE_EMOJI_CODE);
        }

        EmojiGroup group = request.getGroupId() != null ? findGroup(request.getGroupId()) : null;

        int nextOrder = group != null
                ? emojiRepository.findByGroupIdOrderBySortOrderAsc(group.getId()).size()
                : emojiRepository.findByGroupIsNullOrderBySortOrderAsc().size();

        CommunityEmoji emoji = CommunityEmoji.builder()
                .group(group)
                .code(code)
                .unicode(request.getUnicode())
                .imageUrl(request.getImageUrl())
                .label(request.getLabel())
                .sortOrder(nextOrder)
                .build();

        return EmojiAdminResponse.from(emojiRepository.save(emoji));
    }

    @Transactional
    public EmojiAdminResponse update(Long id, UpdateEmojiRequest request) {
        CommunityEmoji emoji = findEmoji(id);

        String newUnicode  = request.getUnicode()   != null ? request.getUnicode()   : emoji.getUnicode();
        String newImageUrl = request.getImageUrl()  != null ? request.getImageUrl()  : emoji.getImageUrl();
        String newLabel    = request.getLabel()     != null ? request.getLabel()     : emoji.getLabel();
        EmojiGroup newGroup = request.getGroupId() != null
                ? findGroup(request.getGroupId())
                : emoji.getGroup();

        emoji.update(newImageUrl, newUnicode, newLabel, emoji.getIsActive(), emoji.getSortOrder(), newGroup);
        return EmojiAdminResponse.from(emoji);
    }

    @Transactional
    public void delete(Long id) {
        emojiRepository.delete(findEmoji(id));
    }

    @Transactional
    public EmojiAdminResponse toggle(Long id) {
        CommunityEmoji emoji = findEmoji(id);
        emoji.toggleActive();
        return EmojiAdminResponse.from(emoji);
    }

    @Transactional
    public void reorderEmojis(List<Long> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            CommunityEmoji emoji = findEmoji(orderedIds.get(i));
            emoji.updateSortOrder(i);
        }
    }

    public String uploadImage(MultipartFile file) {
        String mimeType = imageValidator.validate(file);
        String originalSavedFileName = imageValidator.generateSavedFileName(file.getOriginalFilename());
        return fileStorageService.uploadImage(file, originalSavedFileName, "emojis", mimeType).imageUrl();
    }

    // ═══════════════════════════════════════════
    // 내부 헬퍼
    // ═══════════════════════════════════════════

    private CommunityEmoji findEmoji(Long id) {
        return emojiRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.EMOJI_NOT_FOUND));
    }

    private EmojiGroup findGroup(Long id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.EMOJI_GROUP_NOT_FOUND));
    }
}
