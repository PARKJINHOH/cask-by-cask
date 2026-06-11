package com.drinkindex.domain.community.service;

import com.drinkindex.admin.service.AdminLogService;
import com.drinkindex.domain.admin.entity.enums.AdminLogTargetType;
import com.drinkindex.domain.admin.entity.enums.AdminLogType;
import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.*;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.entity.enums.PostStatus;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import com.drinkindex.domain.community.repository.*;
import com.drinkindex.domain.producer.entity.Producer;
import com.drinkindex.domain.producer.repository.ProducerRepository;
import com.drinkindex.domain.score.constant.ScoreActions;
import com.drinkindex.domain.score.service.ScoreService;
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
    private final PostVideoService postVideoService;
    private final PostMoveService postMoveService;
    private final PostViewCountService postViewCountService;
    private final NotificationService notificationService;
    private final BadWordFilter badWordFilter;
    private final HtmlSanitizer htmlSanitizer;
    private final ScoreService scoreService;
    private final AdminLogService adminLogService;
    private final ProducerRepository producerRepository;

    // ═══════════════════════════════════════════
    // 조회
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<PostListResponse> getPosts(BoardType boardType, Long prefixId,
                                           String keyword, PostSort sort,
                                           Long authorId, Long commentAuthorId,
                                           Long distilleryTagId, Long userId,
                                           int page, int size) {
        // [패치 9] distilleryTagId — 소식 게시판 증류소 태그 필터
        // 차단한 사용자의 글은 목록에서 제외
        List<Long> blockedIds = blockedAuthorIds(userId);
        return postRepository.findPosts(boardType, prefixId, keyword, sort,
                        authorId, commentAuthorId, distilleryTagId, blockedIds, PageRequest.of(page, size))
                .map(PostListResponse::from);
    }

    private static final int BEST_MIN_LIKE_COUNT = 5;

    // 미디어 첨부 정책 (소규모 서버 디스크 보호 — 서버 증설 시 프론트 RichTextEditor 상수와 함께 상향):
    //   이미지 개당 10MB(NoticeImageValidator)·최대 20장, 동영상 개당 50MB(PostVideoValidator)·최대 2개,
    //   이미지+동영상 합계 100MB. 업로드는 파일당 개별 요청이므로 장수·합계는 저장 시점에 검증한다.
    private static final int  MAX_IMAGES_PER_POST = 20;
    private static final int  MAX_VIDEOS_PER_POST = 2;
    private static final long MAX_MEDIA_TOTAL_BYTES_PER_POST = 100L * 1024 * 1024;

    private void validateMediaPolicy(String htmlContent) {
        if (htmlContent == null) return;
        var doc = Jsoup.parse(htmlContent);

        var images = doc.select("img[src]");
        if (images.size() > MAX_IMAGES_PER_POST) {
            throw new CustomException(ErrorCode.POST_IMAGE_COUNT_EXCEEDED);
        }
        var videos = doc.select("video[src]");
        if (videos.size() > MAX_VIDEOS_PER_POST) {
            throw new CustomException(ErrorCode.POST_VIDEO_COUNT_EXCEEDED);
        }

        var imageUrls = images.stream().map(el -> el.attr("src"))
                .filter(src -> !src.isBlank()).collect(Collectors.toSet());
        var videoUrls = videos.stream().map(el -> el.attr("src"))
                .filter(src -> !src.isBlank()).collect(Collectors.toSet());
        long totalBytes = postImageService.totalFileSize(imageUrls)
                + postVideoService.totalFileSize(videoUrls);
        if (totalBytes > MAX_MEDIA_TOTAL_BYTES_PER_POST) {
            throw new CustomException(ErrorCode.POST_MEDIA_SIZE_EXCEEDED);
        }
    }

    @Transactional(readOnly = true)
    public Page<PostListResponse> getBestPosts(BoardType boardType, Long userId, int page, int size) {
        List<Long> blockedIds = blockedAuthorIds(userId);
        return postRepository.findBestPosts(boardType, BEST_MIN_LIKE_COUNT, blockedIds, PageRequest.of(page, size))
                .map(PostListResponse::from);
    }

    /** 로그인 사용자가 차단한 작성자 ID 목록 (비로그인 시 빈 리스트) */
    private List<Long> blockedAuthorIds(Long userId) {
        return userId == null ? List.of() : userBlockRepository.findBlockedIdsByBlockerId(userId);
    }

    @Transactional
    public PostDetailResponse getPost(Long postId, Long userId, boolean isAdmin, String clientIp) {
        Post post = findPost(postId);

        // 성인 전용 글(주류 나눔 등) 상세는 성인인증자만 열람 가능. 관리자·작성자 본인은 예외.
        if (Boolean.TRUE.equals(post.getAdultOnly()) && !isAdmin) {
            boolean isAuthor = userId != null && post.getAuthor().getId().equals(userId);
            if (!isAuthor) {
                User viewer = userId != null ? userRepository.findById(userId).orElse(null) : null;
                if (viewer == null || !viewer.isAdultVerified()) {
                    throw new CustomException(ErrorCode.ADULT_VERIFICATION_REQUIRED);
                }
            }
        }

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
        validateMediaPolicy(sanitized);

        // 3. 말머리 조회
        PostPrefix prefix = null;
        if (request.getPrefixId() != null) {
            prefix = postPrefixRepository.findById(request.getPrefixId())
                    .orElseThrow(() -> new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND));
        }

        // 성인 전용 글(주류 나눔 등) 작성은 성인인증 필수
        boolean adultOnly = Boolean.TRUE.equals(request.getAdultOnly());
        requireAdultVerified(author, adultOnly);

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

        // [패치 9] 소식 게시판(NOTICE) 증류소 태그 검증/해석
        Producer distilleryTag = resolveDistilleryTag(request.getBoardType(),
                request.getDistilleryTagId(), author);

        // 5. Post 저장
        // 게시판 공지(고정글): 관리자/파트너만 설정 가능, 그 외 요청은 무시
        boolean pinned = canPinPost(author.getRole()) && Boolean.TRUE.equals(request.getIsPinned());

        Post.PostBuilder postBuilder = Post.builder()
                .boardType(request.getBoardType())
                .prefix(prefix)
                .author(author)
                .isAnonymous(anonymous)
                .isPinned(pinned)
                .adultOnly(adultOnly)
                .distilleryTag(distilleryTag)
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

        // 7. 이미지/동영상 URL 동기화
        postImageService.syncImageUsage(post, request.getContent());
        postVideoService.syncVideoUsage(post, request.getContent());

        // [패치 2] 익명 게시글은 점수 미지급 (익명 = 점수 없음 전역 통일).
        //          비익명이라도 ScoreService 내부에서 MEMBER 외(관리자·증류소)는 자동 제외됨([패치 3]).
        if (!post.getIsAnonymous()) {
            // [레벨] 게시글 말머리/게시판에 따라 액션타입 결정 후 점수 지급
            scoreService.award(userId, resolvePostActionType(post), "POST", post.getId());
        }

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

        // 게시판 공지(고정글) 토글 — 관리자/파트너 작성자만 유효 (null이면 변경 안 함)
        if (request.getIsPinned() != null && canPinPost(post.getAuthor().getRole())) {
            post.changePinned(request.getIsPinned());
        }

        String newTitle   = request.getTitle()   != null ? request.getTitle()   : post.getTitle();
        String newContent = request.getContent() != null ? request.getContent() : post.getContent();

        badWordFilter.validate(newTitle, Jsoup.parse(newContent).text());
        String sanitized = htmlSanitizer.sanitize(newContent);
        validateMediaPolicy(sanitized);

        PostPrefix prefix = post.getPrefix();
        if (request.getPrefixId() != null) {
            prefix = postPrefixRepository.findById(request.getPrefixId())
                    .orElseThrow(() -> new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND));
        }

        // 성인 전용으로 변경/유지 시 성인인증 필수 (null이면 기존 값 유지)
        boolean newAdultOnly = request.getAdultOnly() != null
                ? request.getAdultOnly()
                : Boolean.TRUE.equals(post.getAdultOnly());
        requireAdultVerified(findUser(userId), newAdultOnly);

        post.update(newTitle, newContent, sanitized, prefix, newAdultOnly);
        postImageService.syncImageUsage(post, newContent);
        postVideoService.syncVideoUsage(post, newContent);

        return PostDetailResponse.builder(post, true).build();
    }

    // ═══════════════════════════════════════════
    // 삭제 (본인)
    // ═══════════════════════════════════════════

    @Transactional
    public void deletePost(Long postId, Long userId) {
        Post post = findPost(postId);
        User user = findUser(userId);
        boolean isAdmin = Role.SUPER_ADMIN.equals(user.getRole()) || Role.ADMIN.equals(user.getRole());
        if (!post.getAuthor().getId().equals(userId) && !isAdmin) {
            throw new CustomException(ErrorCode.POST_ACCESS_DENIED);
        }
        Long authorId = post.getAuthor().getId();
        // [패치 1] 차감 전에 원래 지급에 쓰인 액션 타입을 확보 (이동 후엔 prefix 등 접근 불가할 수 있음)
        String originalAction = resolvePostActionType(post);
        postMoveService.moveToDeleted(post, userId, null);

        // [패치 1] 본인 삭제 시 고정값(-5)이 아니라 "원래 지급액만큼" 차감 (score_history 추적 기반).
        //          익명 글이었다면 지급 0 → 차감 0으로 자동 처리, 관리자 삭제는 제외.
        if (authorId.equals(userId)) {
            scoreService.deductByReference(authorId, originalAction, "POST", postId);
        }
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

        boolean wasLockedBefore = PostStatus.LOCKED.equals(post.getStatus());
        post.incrementReportCount();

        // [레벨] 신고 잠금 차감 — 이번 신고로 잠금 상태가 된 경우만, 작성자에게 차감
        if (!wasLockedBefore && PostStatus.LOCKED.equals(post.getStatus())) {
            scoreService.deduct(post.getAuthor().getId(), ScoreActions.POST_LOCKED, "POST", postId);
        }
    }

    // ═══════════════════════════════════════════
    // 추천 / 비추천
    // ═══════════════════════════════════════════

    @Transactional
    public void likePost(Long postId, boolean isLike, Long userId) {
        Post post = findPost(postId);
        if (post.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.SELF_LIKE_NOT_ALLOWED);
        }
        User user = findUser(userId);

        boolean[] newLikeAdded = {false};
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
                    newLikeAdded[0] = true;
                }
        );

        // [레벨] 추천 받음 — 게시글 작성자에게 (신규 추천, 자기 게시글 제외)
        if (newLikeAdded[0] && !post.getAuthor().getId().equals(userId)) {
            scoreService.award(post.getAuthor().getId(), ScoreActions.POST_LIKED, "POST", postId);
        }

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

    @Transactional(readOnly = true)
    public Page<PostListResponse> getMyScraps(Long userId, int page, int size) {
        return postScrapRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(scrap -> PostListResponse.from(scrap.getPost()));
    }

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

    @Transactional
    public void hidePost(Long postId, User actor) {
        Post post = findPost(postId);
        checkModeratorPermission(actor, post.getBoardType());
        post.hide();
        adminLogService.record(actor, AdminLogType.CONTENT_HIDE,
                AdminLogTargetType.POST, postId,
                String.format("게시글 숨김 (게시판: %s, 제목: %s)", post.getBoardType(), post.getTitle()),
                null);
    }

    @Transactional
    public void restorePostHide(Long postId, User actor) {
        Post post = findPost(postId);
        checkModeratorPermission(actor, post.getBoardType());
        post.restore();
        adminLogService.record(actor, AdminLogType.CONTENT_RESTORE,
                AdminLogTargetType.POST, postId,
                String.format("게시글 숨김 복구 (게시판: %s, 제목: %s)", post.getBoardType(), post.getTitle()),
                null);
    }

    private void checkModeratorPermission(User actor, BoardType boardType) {
        if (actor.getRole() == Role.SUPER_ADMIN || actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() == Role.MODERATOR && actor.getBoardPermissions().contains(boardType)) return;
        throw new CustomException(ErrorCode.FORBIDDEN);
    }

    @Transactional(readOnly = true)
    public Page<PostReportAdminResponse> getReports(ReportStatus status, int page, int size) {
        return postRepository.findReports(status, PageRequest.of(page, size))
                .map(PostReportAdminResponse::from);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    /** 성인 전용 글의 작성·수정은 성인인증을 요구한다. */
    private void requireAdultVerified(User user, boolean adultOnly) {
        if (adultOnly && !user.isAdultVerified()) {
            throw new CustomException(ErrorCode.ADULT_VERIFICATION_REQUIRED);
        }
    }

    private String resolvePostActionType(Post post) {
        if (BoardType.NOTICE.equals(post.getBoardType())) {
            return ScoreActions.POST_WRITE_NOTICE;
        }
        if (post.getPrefix() == null) {
            return ScoreActions.POST_WRITE_GENERAL;
        }
        return switch (post.getPrefix().getName()) {
            case "질문" -> ScoreActions.POST_WRITE_QUESTION;
            case "리뷰" -> ScoreActions.POST_WRITE_REVIEW;
            case "나눔" -> ScoreActions.POST_WRITE_SHARING;
            case "증류소투어" -> ScoreActions.POST_WRITE_DISTILLERY_TOUR;
            default -> ScoreActions.POST_WRITE_GENERAL;
        };
    }

    private Post findPost(Long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    // [패치 9] 소식 게시판 증류소 태그 해석.
    //   - NOTICE 게시판이 아니면 태그 무시(null)
    //   - PARTNER(증류소 담당): 본인 담당 증류소만 태그 가능. (지정 없으면 본인 담당 증류소 자동 태그)
    //   - ADMIN/SUPER_ADMIN: 임의 증류소 태그 가능 or 태그 없음
    private Producer resolveDistilleryTag(BoardType boardType, Long distilleryTagId, User author) {
        if (!BoardType.NOTICE.equals(boardType)) {
            return null; // 소식 게시판 외에는 증류소 태그 없음
        }

        Role role = author.getRole();

        if (Role.PARTNER.equals(role)) {
            Producer own = author.getProducer();
            if (own == null) {
                throw new CustomException(ErrorCode.POST_DISTILLERY_TAG_FORBIDDEN);
            }
            // 지정이 없으면 본인 담당 증류소로 자동 태그, 지정 시 본인 담당과 일치해야 함
            if (distilleryTagId != null && !distilleryTagId.equals(own.getId())) {
                throw new CustomException(ErrorCode.POST_DISTILLERY_TAG_FORBIDDEN);
            }
            return own;
        }

        // ADMIN/SUPER_ADMIN: 임의 증류소 태그 가능, 미지정이면 없음
        if (distilleryTagId == null) {
            return null;
        }
        return producerRepository.findById(distilleryTagId)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
    }

    // 게시판 공지(고정글) 설정 권한: 최고관리자/관리자/파트너
    private boolean canPinPost(Role role) {
        return role == Role.SUPER_ADMIN || role == Role.ADMIN || role == Role.PARTNER;
    }

    private void validateBoardPermission(BoardType boardType, Role role) {
        if (BoardType.NOTICE.equals(boardType)
                && !Role.SUPER_ADMIN.equals(role)
                && !Role.ADMIN.equals(role)
                && !Role.PARTNER.equals(role)) {
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
