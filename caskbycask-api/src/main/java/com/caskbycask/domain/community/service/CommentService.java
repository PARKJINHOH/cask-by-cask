package com.caskbycask.domain.community.service;

import com.caskbycask.admin.service.AdminLogService;
import com.caskbycask.domain.admin.entity.enums.AdminLogTargetType;
import com.caskbycask.domain.admin.entity.enums.AdminLogType;
import com.caskbycask.domain.community.dto.*;
import com.caskbycask.domain.community.entity.*;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.entity.enums.ReportStatus;
import com.caskbycask.domain.community.repository.*;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service("communityCommentService")
@RequiredArgsConstructor
public class CommentService {

    private final PostCommentRepository commentRepository;
    private final PostReportRepository postReportRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final CommentEmojiReactionRepository reactionRepository;
    private final NotificationService notificationService;
    private final AdminLogService adminLogService;
    private final BadWordFilter badWordFilter;
    private final ScoreService scoreService;

    // ═══════════════════════════════════════════
    // 댓글 목록
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<PostCommentResponse> getComments(Long postId, Long userId, Role currentRole, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").ascending());

        // 차단한 사용자의 댓글은 목록에서 완전히 제외
        List<Long> blockedIds = userId == null
                ? List.of()
                : userBlockRepository.findBlockedIdsByBlockerId(userId);
        boolean hasBlocks = !blockedIds.isEmpty();

        Page<PostComment> roots = hasBlocks
                ? commentRepository.findByPostIdAndParentIsNullAndAuthorIdNotIn(
                        postId, blockedIds, pageRequest)
                : commentRepository.findByPostIdAndParentIsNull(postId, pageRequest);

        // 루트 댓글 ID 수집
        List<Long> rootIds = roots.stream().map(PostComment::getId).collect(Collectors.toList());

        // [N+1 방지] 대댓글을 루트 ID 전체에 대해 단일 쿼리로 일괄 로드 후 부모별 그룹핑
        Map<Long, List<PostComment>> childrenMap = new HashMap<>();
        if (!rootIds.isEmpty()) {
            List<PostComment> allChildren = hasBlocks
                    ? commentRepository.findByParentIdInAndAuthorIdNotInOrderByParentIdAscCreatedAtAsc(
                            rootIds, blockedIds)
                    : commentRepository.findByParentIdInOrderByParentIdAscCreatedAtAsc(rootIds);
            allChildren.forEach(c ->
                    childrenMap.computeIfAbsent(c.getParent().getId(), k -> new ArrayList<>()).add(c));
        }

        // 전체 댓글 ID (루트 + 대댓글) 수집
        List<Long> allCommentIds = new ArrayList<>(rootIds);
        childrenMap.values().forEach(children ->
                children.forEach(c -> allCommentIds.add(c.getId())));

        // [패치 13] 이모지 반응 일괄 로드 (다형성: POST_COMMENT 대상)
        Map<Long, List<CommentEmojiReaction>> reactionMap = new HashMap<>();
        if (!allCommentIds.isEmpty()) {
            reactionRepository.findByTargetTypeAndTargetIdIn(
                            com.caskbycask.domain.community.entity.enums.EmojiTargetType.POST_COMMENT, allCommentIds)
                    .forEach(r ->
                            reactionMap.computeIfAbsent(r.getTargetId(), k -> new ArrayList<>()).add(r));
        }

        // [N+1 방지] 멘션 대상 닉네임을 일괄 조회 (루트+대댓글 전체에서 수집)
        Set<Long> mentionedIds = new HashSet<>();
        roots.forEach(r -> { if (r.getMentionedUserId() != null) mentionedIds.add(r.getMentionedUserId()); });
        childrenMap.values().forEach(children -> children.forEach(c -> {
            if (c.getMentionedUserId() != null) mentionedIds.add(c.getMentionedUserId());
        }));
        Map<Long, String> mentionNicknames = mentionedIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(mentionedIds).stream()
                        .collect(Collectors.toMap(User::getId, User::getNickname));

        Set<Long> blockedSet = new HashSet<>(blockedIds);
        return roots.map(root -> toResponse(root, childrenMap.getOrDefault(root.getId(), List.of()),
                reactionMap, blockedSet, mentionNicknames, userId, currentRole));
    }

    // ═══════════════════════════════════════════
    // 댓글 작성
    // ═══════════════════════════════════════════

    @Transactional
    public PostCommentResponse createComment(Long postId, CreateCommentRequest request, Long userId) {
        badWordFilter.validate(request.getContent());

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
        User author = findUser(userId);

        PostComment parent = null;
        boolean cascadeSecret = false;
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
            // 같은 게시글 소속 확인
            if (parent.getPost() == null || !parent.getPost().getId().equals(postId)) {
                throw new CustomException(ErrorCode.COMMENT_NOT_FOUND);
            }
            // 2단계 이상 중첩 불가
            if (parent.getParent() != null) {
                throw new CustomException(ErrorCode.NESTED_REPLY_NOT_ALLOWED);
            }
            // 비밀댓글 캐스케이딩: 부모가 비밀이거나, 형제 대댓글 중 비밀댓글이 하나라도 있으면
            // 이후 모든 대댓글은 강제로 비밀댓글 (서버 강제 — 클라이언트 선택값보다 우선)
            cascadeSecret = Boolean.TRUE.equals(parent.getIsSecret())
                    || commentRepository.existsByParentIdAndIsSecretTrue(parent.getId());
        }

        boolean isPostAuthorAnonymous = Boolean.TRUE.equals(post.getIsAnonymous())
                && post.getAuthor().getId().equals(userId);

        PostComment comment = PostComment.builder()
                .post(post)
                .author(author)
                .parent(parent)
                .content(request.getContent())
                .mentionedUserId(request.getMentionedUserId())
                .isAnonymous(isPostAuthorAnonymous)
                .isSecret(cascadeSecret || Boolean.TRUE.equals(request.getIsSecret()))
                .build();

        PostComment saved = commentRepository.save(comment);
        postRepository.incrementCommentCount(postId);

        // [레벨] 댓글 작성 점수 지급 (일일 한도 적용)
        scoreService.award(userId, ScoreActions.COMMENT_WRITE, "COMMENT", saved.getId());

        // 알림 발송 (비동기)
        sendCommentNotifications(saved, post, parent, request.getMentionedUserId(), userId);

        // 본인이 작성한 댓글이므로 role과 무관하게 항상 열람 가능 (canViewSecret 작성자 본인 분기)
        return toResponseSingle(saved, userId, null);
    }

    // ═══════════════════════════════════════════
    // 댓글 수정
    // ═══════════════════════════════════════════

    @Transactional
    public PostCommentResponse updateComment(Long postId, Long commentId,
                                             UpdateCommentRequest request, Long userId) {
        badWordFilter.validate(request.getContent());
        PostComment comment = findComment(commentId, postId);

        if (!comment.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.COMMENT_ACCESS_DENIED);
        }
        comment.updateContent(request.getContent());

        // 본인이 작성한 댓글이므로 role과 무관하게 항상 열람 가능 (canViewSecret 작성자 본인 분기)
        return toResponseSingle(comment, userId, null);
    }

    // ═══════════════════════════════════════════
    // 댓글 삭제 (Soft Delete)
    // ═══════════════════════════════════════════

    @Transactional
    public void deleteComment(Long postId, Long commentId, Long userId) {
        PostComment comment = findComment(commentId, postId);
        User user = findUser(userId);
        boolean isAdmin = Role.SUPER_ADMIN.equals(user.getRole()) || Role.ADMIN.equals(user.getRole());

        if (!comment.getAuthor().getId().equals(userId) && !isAdmin) {
            throw new CustomException(ErrorCode.COMMENT_ACCESS_DENIED);
        }
        comment.softDelete();

        if (comment.getPost() != null) {
            postRepository.decrementCommentCount(postId);
        }
    }

    // ═══════════════════════════════════════════
    // 댓글 신고
    // ═══════════════════════════════════════════

    @Transactional
    public void reportComment(Long postId, Long commentId, PostReportRequest request, Long userId) {
        PostComment comment = findComment(commentId, postId);
        if (comment.isDeleted()) {
            throw new CustomException(ErrorCode.COMMENT_NOT_FOUND);
        }
        if (comment.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.SELF_REPORT_NOT_ALLOWED);
        }
        if (postReportRepository.existsByCommentIdAndReporterId(commentId, userId)) {
            throw new CustomException(ErrorCode.DUPLICATE_REPORT);
        }

        User reporter = findUser(userId);
        PostReport report = PostReport.builder()
                .comment(comment)
                .reporter(reporter)
                .reason(request.getReason())
                .build();
        postReportRepository.save(report);

        // 신고 누적 시 자동 숨김(임계치 ReportConstants.COMMENT_HIDE_THRESHOLD)
        comment.incrementReportCount();
    }

    @Transactional
    public void hideComment(Long commentId, User actor) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        checkModeratorPermission(actor, comment);
        comment.setHidden(true);
        // 숨김 = 신고 인정 → 해당 댓글의 미처리 신고 처리완료(배지에서 제외)
        postReportRepository.findByCommentIdAndStatus(commentId, ReportStatus.PENDING)
                .forEach(PostReport::resolve);
        adminLogService.record(actor, AdminLogType.CONTENT_HIDE,
                AdminLogTargetType.COMMENT, commentId,
                String.format("댓글 숨김 (ID: %d)", commentId), null);
    }

    @Transactional
    public void restoreComment(Long commentId, User actor) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        checkModeratorPermission(actor, comment);
        comment.setHidden(false);
        // 숨김 복구 = 신고 기각 → 해당 댓글의 미처리 신고 기각 처리(배지에서 제외)
        postReportRepository.findByCommentIdAndStatus(commentId, ReportStatus.PENDING)
                .forEach(PostReport::dismiss);
        adminLogService.record(actor, AdminLogType.CONTENT_RESTORE,
                AdminLogTargetType.COMMENT, commentId,
                String.format("댓글 숨김 복구 (ID: %d)", commentId), null);
    }

    // 관리자 수동 신고 횟수 조정
    @Transactional
    public void updateReportCount(Long commentId, int count) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        comment.updateReportCount(count);
    }

    // 관리자/모더레이터의 댓글 삭제 (신고 처리용) — soft delete + 미처리 신고 처리완료
    @Transactional
    public void adminDeleteComment(Long commentId, User actor) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        checkModeratorPermission(actor, comment);
        if (!comment.isDeleted()) {
            comment.softDelete();
            if (comment.getPost() != null) {
                postRepository.decrementCommentCount(comment.getPost().getId());
            }
        }
        postReportRepository.findByCommentIdAndStatus(commentId, ReportStatus.PENDING)
                .forEach(PostReport::resolve);
    }

    private void checkModeratorPermission(User actor, PostComment comment) {
        if (actor.getRole() == Role.SUPER_ADMIN || actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() == Role.MODERATOR && comment.getPost() != null) {
            if (actor.getBoardPermissions().contains(comment.getPost().getBoardType())) return;
        }
        throw new CustomException(ErrorCode.FORBIDDEN);
    }

    // ═══════════════════════════════════════════
    // Private 헬퍼
    // ═══════════════════════════════════════════

    // 단일 댓글(작성/수정 응답) — 작성자 본인 기준이라 차단 집합은 비고, 멘션 닉네임만 단건 조회.
    private PostCommentResponse toResponseSingle(PostComment comment, Long currentUserId, Role currentRole) {
        Map<Long, String> mentionMap = comment.getMentionedUserId() == null
                ? Map.of()
                : userRepository.findById(comment.getMentionedUserId())
                        .map(u -> Map.of(u.getId(), u.getNickname())).orElse(Map.of());
        return toResponse(comment, List.of(), Map.of(), Set.of(), mentionMap, currentUserId, currentRole);
    }

    private PostCommentResponse toResponse(PostComment comment, List<PostComment> children,
                                           Map<Long, List<CommentEmojiReaction>> reactionMap,
                                           Set<Long> blockedSet, Map<Long, String> mentionNicknames,
                                           Long currentUserId, Role currentRole) {
        boolean deleted = comment.isDeleted();

        if (deleted) {
            List<PostCommentResponse> childResponses = children.stream()
                    .map(child -> toResponse(child, List.of(), reactionMap, blockedSet, mentionNicknames, currentUserId, currentRole))
                    .collect(Collectors.toList());
            return PostCommentResponse.builder()
                    .id(comment.getId())
                    .authorNickname(null)
                    .authorNicknameFixed(null)
                    .content("삭제된 댓글입니다.")
                    .mentionedUserNickname(null)
                    .emojiReactions(List.of())
                    .children(childResponses)
                    .createdAt(comment.getCreatedAt())
                    .isMyComment(false)
                    .isDeleted(true)
                    .isHidden(false)
                    .isSecret(comment.getIsSecret())
                    .isSecretMasked(false)
                    .build();
        }

        // 숨김 처리된 댓글: 내용 마스킹 + "숨김 처리된 댓글입니다" 표시. 대댓글은 유지.
        if (Boolean.TRUE.equals(comment.getIsHidden())) {
            List<PostCommentResponse> childResponses = children.stream()
                    .map(child -> toResponse(child, List.of(), reactionMap, blockedSet, mentionNicknames, currentUserId, currentRole))
                    .collect(Collectors.toList());
            return PostCommentResponse.builder()
                    .id(comment.getId())
                    .authorNickname(null)
                    .authorNicknameFixed(null)
                    .content("숨김 처리된 댓글입니다.")
                    .mentionedUserNickname(null)
                    .emojiReactions(List.of())
                    .children(childResponses)
                    .createdAt(comment.getCreatedAt())
                    .isMyComment(false)
                    .isDeleted(false)
                    .isHidden(true)
                    .isSecret(comment.getIsSecret())
                    .isSecretMasked(false)
                    .build();
        }

        boolean blocked = currentUserId != null
                && !comment.getAuthor().getId().equals(currentUserId)
                && blockedSet.contains(comment.getAuthor().getId());

        // 비밀댓글: 작성자 본인 + 게시글 작성자 + 최고관리자만 열람 가능, 그 외에는 마스킹
        boolean secretMasked = !blocked
                && Boolean.TRUE.equals(comment.getIsSecret())
                && !canViewSecret(comment, currentUserId, currentRole);

        boolean anon = Boolean.TRUE.equals(comment.getIsAnonymous());
        boolean maskAuthor = blocked || secretMasked || anon;
        String authorNickname = (blocked || secretMasked) ? null : (anon ? "익명" : comment.getAuthor().getNickname());
        String authorRole            = maskAuthor ? null : comment.getAuthor().getRole().name();
        Integer authorLevel          = maskAuthor ? null : comment.getAuthor().getCurrentLevel();
        Integer authorMaturingPower  = maskAuthor ? null : comment.getAuthor().getMaturingPower();
        Boolean authorNicknameFixed  = maskAuthor ? null : comment.getAuthor().getNicknameFixed();
        String authorProfileImageUrl = maskAuthor ? null : comment.getAuthor().getProfileImageUrl();
        String content = blocked ? "차단한 사용자의 댓글입니다"
                : secretMasked ? "비밀 댓글입니다"
                : comment.getContent();

        String mentionedNickname = null;
        if (!blocked && !secretMasked && comment.getMentionedUserId() != null) {
            mentionedNickname = mentionNicknames.get(comment.getMentionedUserId());
        }

        List<EmojiReactionSummary> emojiReactions =
                buildEmojiReactionSummaries(reactionMap.getOrDefault(comment.getId(), List.of()), currentUserId);

        List<PostCommentResponse> childResponses = children.stream()
                .map(child -> toResponse(child, List.of(), reactionMap, blockedSet, mentionNicknames, currentUserId, currentRole))
                .collect(Collectors.toList());

        Long authorId = (blocked || secretMasked || anon) ? null : comment.getAuthor().getId();

        return PostCommentResponse.builder()
                .id(comment.getId())
                .authorNickname(authorNickname)
                .authorRole(authorRole)
                .authorLevel(authorLevel)
                .authorMaturingPower(authorMaturingPower)
                .authorNicknameFixed(authorNicknameFixed)
                .authorProfileImageUrl(authorProfileImageUrl)
                .authorId(authorId)
                .content(content)
                .mentionedUserNickname(mentionedNickname)
                .emojiReactions(emojiReactions)
                .children(childResponses)
                .createdAt(comment.getCreatedAt())
                .isMyComment(currentUserId != null && comment.getAuthor().getId().equals(currentUserId))
                .isDeleted(false)
                .isHidden(false)
                .isSecret(comment.getIsSecret())
                .isSecretMasked(secretMasked)
                .build();
    }

    // 비밀댓글 열람 권한: 댓글 작성자 본인 + 게시글 작성자(글쓴이) + 최고관리자(SUPER_ADMIN)
    private boolean canViewSecret(PostComment comment, Long currentUserId, Role currentRole) {
        if (currentUserId == null) return false;
        if (comment.getAuthor().getId().equals(currentUserId)) return true;
        if (comment.getPost() != null && comment.getPost().getAuthor().getId().equals(currentUserId)) return true;
        return currentRole == Role.SUPER_ADMIN;
    }

    private List<EmojiReactionSummary> buildEmojiReactionSummaries(
            List<CommentEmojiReaction> reactions, Long currentUserId) {
        // emoji.id 기준으로 그룹화
        Map<Long, List<CommentEmojiReaction>> grouped = reactions.stream()
                .collect(Collectors.groupingBy(r -> r.getEmoji().getId()));

        return grouped.entrySet().stream()
                .map(entry -> {
                    Long emojiId = entry.getKey();
                    List<CommentEmojiReaction> group = entry.getValue();
                    CommunityEmoji emoji = group.get(0).getEmoji();
                    boolean isMyReaction = currentUserId != null
                            && group.stream().anyMatch(r -> r.getUser().getId().equals(currentUserId));
                    return new EmojiReactionSummary(emojiId, emoji.getUnicode(),
                            emoji.getImageUrl(), group.size(), isMyReaction);
                })
                .collect(Collectors.toList());
    }

    private void sendCommentNotifications(PostComment comment, Post post, PostComment parent,
                                          Long mentionedUserId, Long authorId) {
        String boardTargetType = post.getBoardType().name(); // "FREE" 또는 "NOTICE"

        // 게시글 작성자에게 COMMENT 알림 (본인 댓글 제외)
        if (!post.getAuthor().getId().equals(authorId)) {
            notificationService.send(post.getAuthor(), NotificationType.COMMENT,
                    "'" + post.getTitle() + "' 게시글에 댓글이 달렸습니다.", boardTargetType, post.getId());
        }
        // 부모 댓글 작성자에게 REPLY 알림 → 게시글로 이동
        if (parent != null && !parent.getAuthor().getId().equals(authorId)) {
            notificationService.send(parent.getAuthor(), NotificationType.REPLY,
                    "'" + post.getTitle() + "' 게시글에 답글이 달렸습니다.", boardTargetType, post.getId());
        }
        // 멘션된 사용자에게 MENTION 알림 → 게시글로 이동
        // [악용 방지] 멘션 대상이 작성자를 차단했다면 알림을 보내지 않는다(차단 관계 존중, 멘션 스팸 차단).
        boolean mentionedParentAuthor = parent != null
                && parent.getAuthor().getId().equals(mentionedUserId);
        if (mentionedUserId != null && !mentionedUserId.equals(authorId) && !mentionedParentAuthor
                && !userBlockRepository.existsByBlockerIdAndBlockedId(mentionedUserId, authorId)) {
            userRepository.findById(mentionedUserId).ifPresent(mentioned ->
                    notificationService.send(mentioned, NotificationType.MENTION,
                            "'" + post.getTitle() + "' 게시글에서 회원님이 멘션되었습니다.", boardTargetType, post.getId()));
        }
    }

    private PostComment findComment(Long commentId, Long postId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        // 같은 게시글 소속 확인 (post가 null이면 게시글이 삭제된 것)
        if (comment.getPost() == null || !comment.getPost().getId().equals(postId)) {
            throw new CustomException(ErrorCode.COMMENT_NOT_FOUND);
        }
        return comment;
    }

    private User findUser(Long id) {
        return userRepository.getByIdOrThrow(id);
    }
}
