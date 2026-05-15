package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.CommentEmojiReaction;
import com.drinkindex.domain.community.entity.CommunityEmoji;
import com.drinkindex.domain.community.entity.PostComment;
import com.drinkindex.domain.community.repository.CommentEmojiReactionRepository;
import com.drinkindex.domain.community.repository.CommunityEmojiRepository;
import com.drinkindex.domain.community.repository.PostCommentRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmojiService {

    private final CommunityEmojiRepository emojiRepository;
    private final CommentEmojiReactionRepository reactionRepository;
    private final PostCommentRepository commentRepository;
    private final UserRepository userRepository;

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<EmojiResponse> getActiveEmojis() {
        return emojiRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(EmojiResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public EmojiReactionToggleResponse toggleReaction(Long commentId, Long emojiId, Long userId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        CommunityEmoji emoji = emojiRepository.findById(emojiId)
                .orElseThrow(() -> new CustomException(ErrorCode.EMOJI_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        reactionRepository.findByCommentIdAndEmojiIdAndUserId(commentId, emojiId, userId)
                .ifPresentOrElse(
                        reactionRepository::delete,
                        () -> {
                            CommentEmojiReaction reaction = CommentEmojiReaction.builder()
                                    .comment(comment).emoji(emoji).user(user).build();
                            reactionRepository.save(reaction);
                        }
                );

        long count = reactionRepository.countByCommentIdAndEmojiId(commentId, emojiId);
        boolean isMyReaction = reactionRepository
                .findByCommentIdAndEmojiIdAndUserId(commentId, emojiId, userId).isPresent();

        return new EmojiReactionToggleResponse(emojiId, count, isMyReaction);
    }

    // ═══════════════════════════════════════════
    // 관리자 API
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<EmojiAdminResponse> getAll(int page, int size) {
        return emojiRepository.findAllByOrderBySortOrderAsc(PageRequest.of(page, size))
                .map(EmojiAdminResponse::from);
    }

    @Transactional
    public EmojiAdminResponse create(CreateEmojiRequest request) {
        if (!StringUtils.hasText(request.getUnicode()) && !StringUtils.hasText(request.getImageUrl())) {
            throw new CustomException(ErrorCode.EMOJI_UNICODE_OR_IMAGE_REQUIRED);
        }

        // code 자동 생성: unicode가 있으면 unicode, 없으면 UUID prefix
        String code = StringUtils.hasText(request.getUnicode())
                ? request.getUnicode()
                : "img-" + UUID.randomUUID().toString().substring(0, 8);

        if (emojiRepository.existsByCode(code)) {
            throw new CustomException(ErrorCode.DUPLICATE_EMOJI_CODE);
        }

        CommunityEmoji emoji = CommunityEmoji.builder()
                .code(code)
                .unicode(request.getUnicode())
                .imageUrl(request.getImageUrl())
                .label(request.getLabel())
                .sortOrder(request.getSortOrder())
                .build();

        return EmojiAdminResponse.from(emojiRepository.save(emoji));
    }

    @Transactional
    public EmojiAdminResponse update(Long id, UpdateEmojiRequest request) {
        CommunityEmoji emoji = findEmoji(id);

        String newUnicode  = request.getUnicode()   != null ? request.getUnicode()   : emoji.getUnicode();
        String newImageUrl = request.getImageUrl()  != null ? request.getImageUrl()  : emoji.getImageUrl();
        String newLabel    = request.getLabel()     != null ? request.getLabel()     : emoji.getLabel();
        int    newOrder    = request.getSortOrder() != null ? request.getSortOrder() : emoji.getSortOrder();

        emoji.update(newImageUrl, newUnicode, newLabel, emoji.getIsActive(), newOrder);
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

    private CommunityEmoji findEmoji(Long id) {
        return emojiRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.EMOJI_NOT_FOUND));
    }
}
