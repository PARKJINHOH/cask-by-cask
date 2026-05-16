package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.*;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.entity.enums.PostStatus;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import com.drinkindex.domain.community.repository.*;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.constants.NotificationConstants;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
import com.drinkindex.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostScrapRepository postScrapRepository;
    private final PostReportRepository postReportRepository;
    private final PostPrefixRepository postPrefixRepository;
    private final SeriesRepository seriesRepository;
    private final DeletedPostRepository deletedPostRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;
    private final PollRepository pollRepository;
    private final PostImageService postImageService;
    private final PostMoveService postMoveService;
    private final PostViewCountService postViewCountService;
    private final NotificationService notificationService;
    private final BadWordFilter badWordFilter;
    private final HtmlSanitizer htmlSanitizer;

    // ═══════════════════════════════════════════
    // 조회
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<PostListResponse> getPosts(BoardType boardType, Long prefixId,
                                           String keyword, PostSort sort, int page, int size) {
        return postRepository.findPosts(boardType, prefixId, keyword, sort, PageRequest.of(page, size))
                .map(PostListResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<PostListResponse> getBestPosts(BoardType boardType, PostPeriod period, int page, int size) {
        return postRepository.findBestPosts(boardType, period, PageRequest.of(page, size))
                .map(PostListResponse::from);
    }

    @Transactional
    public PostDetailResponse getPost(Long postId, Long userId, boolean isAdmin, String clientIp) {
        Post post = findPost(postId);
        boolean locked = PostStatus.LOCKED.equals(post.getStatus());
        boolean showContent = !locked || isAdmin;

        // 조회수 +1 (Redis 중복 방지)
        postViewCountService.tryIncrementViewCount(postId, userId, clientIp);

        PostDetailResponse.Builder builder = PostDetailResponse.builder(post, showContent);

        if (userId != null) {
            boolean mine = post.getAuthor().getId().equals(userId);
            builder.isMyPost(mine);
            builder.isLiked(postLikeRepository.existsByPostIdAndUserId(postId, userId));
            builder.isScrapped(postScrapRepository.existsByPostIdAndUserId(postId, userId));
            // 작성자가 차단된 사용자인지 (익명 글 차단 불가)
            Long authorId = post.getIsAnonymous() ? null : post.getAuthor().getId();
            boolean blocked = !mine && authorId != null
                    && userBlockRepository.existsByBlockerIdAndBlockedId(userId, authorId);
            builder.isBlocked(blocked);
        }

        return builder.build();
    }

    // ═══════════════════════════════════════════
    // 작성
    // ═══════════════════════════════════════════

    @Transactional
    public PostDetailResponse createPost(CreatePostRequest request, Long userId) {
        User author = findUser(userId);
        validateBoardPermission(request.getBoardType(), author.getRole());

        // 1. 욕설 검사
        badWordFilter.validate(request.getTitle(), Jsoup.parse(request.getContent()).text());

        // 2. HTML Sanitize
        String sanitized = htmlSanitizer.sanitize(request.getContent());

        // 3. 말머리 조회
        PostPrefix prefix = null;
        if (request.getPrefixId() != null) {
            prefix = postPrefixRepository.findById(request.getPrefixId())
                    .orElseThrow(() -> new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND));
        }

        // 4. 시리즈 소속 확인
        Series series = null;
        if (request.getSeriesId() != null) {
            series = seriesRepository.findById(request.getSeriesId())
                    .orElseThrow(() -> new CustomException(ErrorCode.SERIES_NOT_FOUND));
            if (!series.getAuthor().getId().equals(userId)) {
                throw new CustomException(ErrorCode.SERIES_ACCESS_DENIED);
            }
        }

        // FREE 게시판이 아닌 경우 익명 불가
        boolean anonymous = BoardType.FREE.equals(request.getBoardType())
                && Boolean.TRUE.equals(request.getIsAnonymous());

        // 5. Post 저장
        Post.PostBuilder postBuilder = Post.builder()
                .boardType(request.getBoardType())
                .prefix(prefix)
                .author(author)
                .isAnonymous(anonymous)
                .title(request.getTitle())
                .content(request.getContent())
                .contentSanitized(sanitized);

        if (series != null) {
            postBuilder.series(series).seriesOrder(series.getPostCount() + 1);
        }

        Post post = postRepository.save(postBuilder.build());

        if (series != null) {
            series.incrementPostCount();
        }

        // 6. 투표 저장
        if (request.getPoll() != null) {
            savePoll(post, request.getPoll());
        }

        // 7. 이미지 URL 동기화
        postImageService.syncImageUsage(post, request.getContent());

        return PostDetailResponse.builder(post, true).build();
    }

    // ═══════════════════════════════════════════
    // 수정
    // ═══════════════════════════════════════════

    @Transactional
    public PostDetailResponse updatePost(Long postId, UpdatePostRequest request, Long userId) {
        Post post = findPost(postId);
        if (!post.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.POST_ACCESS_DENIED);
        }

        String newTitle   = request.getTitle()   != null ? request.getTitle()   : post.getTitle();
        String newContent = request.getContent() != null ? request.getContent() : post.getContent();

        badWordFilter.validate(newTitle, Jsoup.parse(newContent).text());
        String sanitized = htmlSanitizer.sanitize(newContent);

        PostPrefix prefix = post.getPrefix();
        if (request.getPrefixId() != null) {
            prefix = postPrefixRepository.findById(request.getPrefixId())
                    .orElseThrow(() -> new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND));
        }

        post.update(newTitle, newContent, sanitized, prefix);
        postImageService.syncImageUsage(post, newContent);

        return PostDetailResponse.builder(post, true).build();
    }

    // ═══════════════════════════════════════════
    // 삭제 (본인)
    // ═══════════════════════════════════════════

    @Transactional
    public void deletePost(Long postId, Long userId) {
        Post post = findPost(postId);
        User user = findUser(userId);
        boolean isAdmin = Role.ADMIN.equals(user.getRole());
        if (!post.getAuthor().getId().equals(userId) && !isAdmin) {
            throw new CustomException(ErrorCode.POST_ACCESS_DENIED);
        }
        postMoveService.moveToDeleted(post, userId, null);
    }

    // ═══════════════════════════════════════════
    // 신고
    // ═══════════════════════════════════════════

    @Transactional
    public void reportPost(Long postId, PostReportRequest request, Long userId) {
        Post post = findPost(postId);

        if (post.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.SELF_REPORT_NOT_ALLOWED);
        }
        if (postReportRepository.existsByPostIdAndReporterId(postId, userId)) {
            throw new CustomException(ErrorCode.DUPLICATE_REPORT);
        }

        User reporter = findUser(userId);
        PostReport report = PostReport.builder()
                .post(post)
                .reporter(reporter)
                .reason(request.getReason())
                .build();
        postReportRepository.save(report);

        post.incrementReportCount();
    }

    // ═══════════════════════════════════════════
    // 추천 / 비추천
    // ═══════════════════════════════════════════

    @Transactional
    public void likePost(Long postId, boolean isLike, Long userId) {
        Post post = findPost(postId);
        User user = findUser(userId);

        postLikeRepository.findByPostIdAndUserId(postId, userId).ifPresentOrElse(
                existing -> {
                    // 재클릭 → 추천 취소
                    postLikeRepository.delete(existing);
                    post.decrementLikeCount();
                },
                () -> {
                    // 신규 추천
                    PostLike newLike = PostLike.builder()
                            .post(post).user(user).isLike(true).build();
                    postLikeRepository.save(newLike);
                    post.incrementLikeCount();
                }
        );

        // 추천 알림 임계치 체크
        if (isLike) {
            int updatedCount = post.getLikeCount();
            if (updatedCount > 0 && updatedCount % NotificationConstants.LIKE_NOTIFY_THRESHOLD == 0) {
                if (!post.getAuthor().getId().equals(userId)) {
                    notificationService.send(
                        post.getAuthor(),
                        NotificationType.LIKE,
                        "게시글 '" + post.getTitle() + "'에 추천이 " + updatedCount + "개 달렸습니다.",
                        "POST", postId
                    );
                }
            }
        }
    }

    // ═══════════════════════════════════════════
    // 스크랩
    // ═══════════════════════════════════════════

    @Transactional
    public void toggleScrap(Long postId, Long userId) {
        Post post = findPost(postId);
        User user = findUser(userId);

        postScrapRepository.findByPostIdAndUserId(postId, userId).ifPresentOrElse(
                postScrapRepository::delete,
                () -> {
                    PostScrap scrap = PostScrap.builder().post(post).user(user).build();
                    postScrapRepository.save(scrap);
                }
        );
    }

    // ═══════════════════════════════════════════
    // 관리자
    // ═══════════════════════════════════════════

    @Transactional
    public void adminDeletePost(Long postId, Long adminId, String deleteReason) {
        Post post = findPost(postId);
        postMoveService.moveToDeleted(post, adminId, deleteReason);
    }

    @Transactional
    public PostDetailResponse restorePost(Long deletedPostId) {
        DeletedPost deleted = deletedPostRepository.findById(deletedPostId)
                .orElseThrow(() -> new CustomException(ErrorCode.DELETED_POST_NOT_FOUND));

        User author = userRepository.findById(deleted.getAuthorId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Post restored = Post.builder()
                .boardType(deleted.getBoardType())
                .author(author)
                .title(deleted.getTitle())
                .content(deleted.getContent())
                .contentSanitized(deleted.getContentSanitized())
                .build();

        Post saved = postRepository.save(restored);
        deletedPostRepository.delete(deleted);

        return PostDetailResponse.builder(saved, true).build();
    }

    @Transactional
    public void unlockPost(Long postId) {
        findPost(postId).unlock();
    }

    @Transactional(readOnly = true)
    public Page<PostReportAdminResponse> getReports(ReportStatus status, int page, int size) {
        return postRepository.findReports(status, PageRequest.of(page, size))
                .map(PostReportAdminResponse::from);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private Post findPost(Long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void validateBoardPermission(BoardType boardType, Role role) {
        if (BoardType.NOTICE.equals(boardType)
                && !Role.ADMIN.equals(role)
                && !Role.DISTILLERY.equals(role)) {
            throw new CustomException(ErrorCode.POST_NOTICE_FORBIDDEN);
        }
    }

    private void savePoll(Post post, PollRequest pollRequest) {
        if (pollRequest.getOptions() == null || pollRequest.getOptions().size() < 2) {
            throw new CustomException(ErrorCode.POLL_OPTION_TOO_FEW);
        }

        Poll poll = Poll.builder()
                .post(post)
                .question(pollRequest.getQuestion())
                .isMultipleChoice(Boolean.TRUE.equals(pollRequest.getIsMultipleChoice()))
                .endsAt(pollRequest.getEndsAt())
                .build();

        List<PollOption> options = pollRequest.getOptions().stream()
                .map(opt -> PollOption.builder()
                        .poll(poll)
                        .optionText(opt.getOptionText())
                        .sortOrder(opt.getSortOrder())
                        .build())
                .collect(Collectors.toList());
        poll.getOptions().addAll(options);

        pollRepository.save(poll);
    }
}
