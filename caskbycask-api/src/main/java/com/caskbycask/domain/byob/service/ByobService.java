package com.caskbycask.domain.byob.service;

import com.caskbycask.domain.byob.dto.*;
import com.caskbycask.domain.byob.entity.Byob;
import com.caskbycask.domain.byob.entity.ByobComment;
import com.caskbycask.domain.byob.entity.ByobParticipant;
import com.caskbycask.domain.byob.entity.enums.ByobStatus;
import com.caskbycask.domain.byob.entity.enums.ParticipantStatus;
import com.caskbycask.domain.byob.repository.ByobCommentRepository;
import com.caskbycask.domain.byob.repository.ByobParticipantRepository;
import com.caskbycask.domain.byob.repository.ByobRepository;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostPrefix;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.community.service.MessageService;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.community.service.PostMoveService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ByobService {

    private final ByobRepository byobRepository;
    private final ByobParticipantRepository participantRepository;
    private final ByobCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostPrefixRepository postPrefixRepository;
    private final HtmlSanitizer htmlSanitizer;
    private final MessageService messageService;
    private final NotificationService notificationService;
    private final PostMoveService postMoveService;

    // ── 목록 ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ByobListResponse> getList(String statusStr, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<Byob> result;
        if (statusStr != null && !statusStr.isBlank()) {
            ByobStatus status = ByobStatus.valueOf(statusStr);
            result = byobRepository.findAllByStatus(status, pageable);
        } else {
            result = byobRepository.findAllOrderByCreatedAtDesc(pageable);
        }
        return result.map(ByobListResponse::from);
    }

    // ── 상세 ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ByobDetailResponse getDetail(Long byobId, Long currentUserId) {
        Byob byob = findByob(byobId);
        ByobParticipantResponse myParticipant = null;
        if (currentUserId != null) {
            myParticipant = participantRepository.findByByobIdAndUserId(byobId, currentUserId)
                    .map(ByobParticipantResponse::from)
                    .orElse(null);
        }
        return ByobDetailResponse.from(byob, myParticipant);
    }

    // ── 생성 ──────────────────────────────────────────────────────

    @Transactional
    public ByobDetailResponse create(Long userId, CreateByobRequest req) {
        if (req.getRecruitEndAt().isBefore(req.getRecruitStartAt())) {
            throw new CustomException(ErrorCode.BYOB_INVALID_DATE_RANGE);
        }
        User host = findUser(userId);
        Byob byob = Byob.builder()
                .host(host)
                .title(req.getTitle().strip())
                .content(req.getContent().strip())
                .location(req.getLocation().strip())
                .address(req.getAddress().strip())
                .eventAt(req.getEventAt())
                .recruitStartAt(req.getRecruitStartAt())
                .recruitEndAt(req.getRecruitEndAt())
                .maxParticipants(req.getMaxParticipants())
                .build();
        Byob saved = byobRepository.save(byob);
        if (req.getHostBottles() != null && !req.getHostBottles().isEmpty()) {
            req.getHostBottles().stream()
               .map(String::strip)
               .filter(s -> !s.isBlank())
               .forEach(saved.getHostBottles()::add);
        }
        if (req.isExposeToFreeBoard()) {
            PostPrefix byobPrefix = postPrefixRepository
                    .findByBoardTypeAndName(BoardType.FREE, "비욥")
                    .orElse(null);
            String infoHtml = buildByobInfoHtml(saved);
            String linkHtml = "<p><a href=\"/community/byob/" + saved.getId()
                    + "\" rel=\"noopener noreferrer\">바로가기</a></p>";
            String fullContent = infoHtml + saved.getContent() + linkHtml;
            String sanitizedContent = infoHtml + htmlSanitizer.sanitize(saved.getContent()) + linkHtml;
            Post freePost = Post.builder()
                    .boardType(BoardType.FREE)
                    .prefix(byobPrefix)
                    .author(host)
                    .isAnonymous(false)
                    .title(saved.getTitle())
                    .content(fullContent)
                    .contentSanitized(sanitizedContent)
                    .build();
            Post savedPost = postRepository.save(freePost);
            saved.setLinkedFreePostId(savedPost.getId());
        }
        return ByobDetailResponse.from(saved, null);
    }

    // ── 수정 ──────────────────────────────────────────────────────

    @Transactional
    public ByobDetailResponse update(Long byobId, Long userId, UpdateByobRequest req) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        if (byob.getApprovedCount() > 0) {
            throw new CustomException(ErrorCode.BYOB_HAS_APPROVED_PARTICIPANT);
        }
        if (req.getRecruitEndAt().isBefore(req.getRecruitStartAt())) {
            throw new CustomException(ErrorCode.BYOB_INVALID_DATE_RANGE);
        }
        List<String> cleaned = req.getHostBottles() == null ? List.of() :
                req.getHostBottles().stream().map(String::strip).filter(s -> !s.isBlank()).toList();
        byob.update(req.getTitle().strip(), req.getContent().strip(),
                req.getLocation().strip(), req.getAddress().strip(),
                req.getEventAt(), req.getRecruitStartAt(), req.getRecruitEndAt(),
                req.getMaxParticipants(), cleaned);
        ByobParticipantResponse myParticipant = participantRepository.findByByobIdAndUserId(byobId, userId)
                .map(ByobParticipantResponse::from).orElse(null);
        return ByobDetailResponse.from(byob, myParticipant);
    }

    // ── 공지(고정글) 토글 ─────────────────────────────────────────
    // 게시글과 달리 수정 폼과 분리된 전용 동작 — 승인 참여자 존재 여부와 무관하게 토글 가능.
    // 권한: 주최자 본인이면서 최고관리자/관리자/파트너.

    @Transactional
    public void changePin(Long byobId, Long userId, boolean pinned) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        if (!canPin(byob.getHost().getRole())) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
        byob.changePinned(pinned);
    }

    // ── 상태 변경 ─────────────────────────────────────────────────

    @Transactional
    public void changeStatus(Long byobId, Long userId, ChangeByobStatusRequest req) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        byob.changeStatus(req.getStatus());

        // CLOSED 전환 시 승인된 참여자 전원에게 상세주소 자동 발송
        if (req.getStatus() == ByobStatus.CLOSED) {
            sendAddressToApprovedParticipants(byob);
        }
    }

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E) a h:mm", java.util.Locale.KOREAN);

    private void sendAddressToApprovedParticipants(Byob byob) {
        List<ByobParticipant> approved = participantRepository
                .findAllByByobIdOrderByAppliedAtAsc(byob.getId())
                .stream()
                .filter(p -> p.getStatus() == ParticipantStatus.APPROVED)
                .toList();

        if (approved.isEmpty()) return;

        User host = byob.getHost();
        String content = String.format(
                "[BYOB 모임 확정 안내]\n\n" +
                "안녕하세요! 참여 확정된 BYOB 모임 상세 정보를 안내드립니다.\n\n" +
                "📌 모임명: %s\n" +
                "📅 모임 날짜: %s\n" +
                "📍 장소: %s\n" +
                "🏠 상세 주소: %s\n\n" +
                "궁금한 점은 이 쪽지로 문의해 주세요!",
                byob.getTitle(),
                byob.getEventAt().format(DATE_FMT),
                byob.getLocation(),
                byob.getAddress()
        );

        for (ByobParticipant participant : approved) {
            messageService.sendSystemMessage(host, participant.getUser(), content);
        }
    }

    private String buildByobInfoHtml(Byob byob) {
        String eventAt       = byob.getEventAt().format(DATE_FMT);
        String recruitStart  = byob.getRecruitStartAt().format(DATE_FMT);
        String recruitEnd    = byob.getRecruitEndAt().format(DATE_FMT);
        return "<table>" +
               "<tr><th>모임 날짜</th><td>" + eventAt + "</td></tr>" +
               "<tr><th>장소</th><td>" + byob.getLocation() + "</td></tr>" +
               "<tr><th>모집 기간</th><td>" + recruitStart + " ~ " + recruitEnd + "</td></tr>" +
               "<tr><th>모집 인원</th><td>" + byob.getMaxParticipants() + "명</td></tr>" +
               "</table>";
    }

    // ── 삭제 ──────────────────────────────────────────────────────

    @Transactional
    public void delete(Long byobId, Long userId) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        if (byob.getApprovedCount() > 0) {
            throw new CustomException(ErrorCode.BYOB_HAS_APPROVED_PARTICIPANT);
        }
        // 자유게시판에 노출(미러)된 연동 게시글이 있으면 함께 삭제 (이미지/동영상도 함께 정리)
        if (byob.getLinkedFreePostId() != null) {
            postRepository.findById(byob.getLinkedFreePostId())
                    .ifPresent(post -> postMoveService.moveToDeleted(
                            post, userId, "BYOB 모임 삭제로 인한 연동 게시글 자동 삭제"));
        }
        byobRepository.delete(byob);
    }

    // ── 참여 신청 ─────────────────────────────────────────────────

    @Transactional
    public ByobParticipantResponse apply(Long byobId, Long userId, ApplyByobRequest req) {
        Byob byob = findByob(byobId);
        if (byob.getHost().getId().equals(userId)) {
            throw new CustomException(ErrorCode.BYOB_HOST_CANNOT_APPLY);
        }
        if (byob.getStatus() != ByobStatus.OPEN) {
            throw new CustomException(ErrorCode.BYOB_NOT_OPEN);
        }
        if (byob.getApprovedCount() >= byob.getMaxParticipants()) {
            throw new CustomException(ErrorCode.BYOB_FULL);
        }
        if (participantRepository.existsByByobIdAndUserId(byobId, userId)) {
            throw new CustomException(ErrorCode.BYOB_ALREADY_APPLIED);
        }
        User user = findUser(userId);
        List<String> cleanedBottles = req.getBottleNames().stream()
                .map(String::strip).filter(s -> !s.isBlank())
                .limit(10).toList();
        if (cleanedBottles.isEmpty()) throw new CustomException(ErrorCode.BYOB_NOT_FOUND);
        String joinedBottles = String.join("\n", cleanedBottles);
        ByobParticipant participant = ByobParticipant.builder()
                .byob(byob)
                .user(user)
                .bottleName(joinedBottles)
                .memo(req.getMemo() != null ? req.getMemo().strip() : null)
                .build();
        byob.incrementPendingCount();
        ByobParticipantResponse result = ByobParticipantResponse.from(participantRepository.save(participant));
        // 주최자에게 신청 알림
        notificationService.send(
                byob.getHost(),
                NotificationType.BYOB_APPLY,
                "'" + user.getNickname() + "'님이 '" + byob.getTitle() + "' 모임에 참여 신청했습니다.",
                "BYOB",
                byobId
        );
        return result;
    }

    // ── 신청 취소 ─────────────────────────────────────────────────

    @Transactional
    public void cancelApply(Long byobId, Long userId) {
        ByobParticipant participant = participantRepository.findByByobIdAndUserId(byobId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.BYOB_PARTICIPANT_NOT_FOUND));
        if (participant.getStatus() != ParticipantStatus.PENDING) {
            throw new CustomException(ErrorCode.BYOB_CANNOT_CANCEL);
        }
        participant.getByob().decrementPendingCount();
        participantRepository.delete(participant);
    }

    // ── 참여자 목록 (주최자) ───────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ByobParticipantResponse> getParticipants(Long byobId, Long userId) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        return participantRepository.findAllByByobIdOrderByAppliedAtAsc(byobId)
                .stream().map(ByobParticipantResponse::from).toList();
    }

    // ── 승인 ──────────────────────────────────────────────────────

    @Transactional
    public void approve(Long byobId, Long participantId, Long userId) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        ByobParticipant p = findParticipant(participantId);
        if (!p.getByob().getId().equals(byobId)) throw new CustomException(ErrorCode.BYOB_PARTICIPANT_NOT_FOUND);
        if (p.getStatus() != ParticipantStatus.PENDING) throw new CustomException(ErrorCode.BYOB_INVALID_STATUS_TRANSITION);
        if (byob.getApprovedCount() >= byob.getMaxParticipants()) throw new CustomException(ErrorCode.BYOB_FULL);
        p.approve();
        byob.incrementApprovedCount();
        byob.decrementPendingCount();
        // 신청자에게 승인 알림
        notificationService.send(
                p.getUser(),
                NotificationType.BYOB_APPROVE,
                "'" + byob.getTitle() + "' 모임 참여 신청이 승인되었습니다.",
                "BYOB",
                byobId
        );
    }

    // ── 거절 ──────────────────────────────────────────────────────

    @Transactional
    public void reject(Long byobId, Long participantId, Long userId, RejectParticipantRequest req) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        ByobParticipant p = findParticipant(participantId);
        if (!p.getByob().getId().equals(byobId)) throw new CustomException(ErrorCode.BYOB_PARTICIPANT_NOT_FOUND);
        if (p.getStatus() != ParticipantStatus.PENDING) throw new CustomException(ErrorCode.BYOB_INVALID_STATUS_TRANSITION);
        p.reject();
        byob.decrementPendingCount();
        // 신청자에게 거절 알림
        notificationService.send(
                p.getUser(),
                NotificationType.BYOB_REJECT,
                "'" + byob.getTitle() + "' 모임 참여 신청이 거절되었습니다.",
                "BYOB",
                byobId
        );
        // 신청자에게 거절 사유 쪽지 발송
        String content = String.format(
                "[BYOB 참여 신청 거절 안내]\n\n" +
                "'%s' 모임 참여 신청이 거절되었습니다.\n\n" +
                "사유: %s",
                byob.getTitle(),
                req.getRejectedReason()
        );
        messageService.sendSystemMessage(byob.getHost(), p.getUser(), content);
    }

    // ── 제외 ──────────────────────────────────────────────────────

    @Transactional
    public void remove(Long byobId, Long participantId, Long userId, RemoveParticipantRequest req) {
        Byob byob = findByob(byobId);
        checkHost(byob, userId);
        ByobParticipant p = findParticipant(participantId);
        if (!p.getByob().getId().equals(byobId)) throw new CustomException(ErrorCode.BYOB_PARTICIPANT_NOT_FOUND);
        if (p.getStatus() != ParticipantStatus.APPROVED) throw new CustomException(ErrorCode.BYOB_INVALID_STATUS_TRANSITION);
        p.remove(req.getRemovedReason());
        byob.decrementApprovedCount();
        // 신청자에게 제외 알림
        notificationService.send(
                p.getUser(),
                NotificationType.BYOB_REMOVE,
                "'" + byob.getTitle() + "' 모임에서 제외되었습니다.",
                "BYOB",
                byobId
        );
    }

    // ── 댓글 조회 ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ByobCommentResponse> getComments(Long byobId, Long userId) {
        findByob(byobId);
        // 로그인한 모든 사용자가 댓글 전체 조회 가능
        List<ByobComment> rawComments = commentRepository.findAllByByobIdOrderByCreatedAt(byobId);
        // 루트 댓글과 답글 분리
        Map<Long, List<ByobComment>> repliesMap = rawComments.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(ByobComment::getParentId));

        return rawComments.stream()
                .filter(c -> c.getParentId() == null)
                .map(c -> {
                    List<ByobCommentResponse> replies = repliesMap.getOrDefault(c.getId(), new ArrayList<>())
                            .stream().map(r -> ByobCommentResponse.from(r, new ArrayList<>())).toList();
                    return ByobCommentResponse.from(c, replies);
                })
                .toList();
    }

    // ── 댓글 작성 ─────────────────────────────────────────────────

    @Transactional
    public ByobCommentResponse createComment(Long byobId, Long userId, CreateByobCommentRequest req) {
        Byob byob = findByob(byobId);
        User author = findUser(userId);
        boolean isHost = byob.getHost().getId().equals(userId);

        User participantUser;
        if (isHost) {
            // 주최자: 루트 댓글 및 답글 모두 가능
            if (req.getParentId() != null) {
                ByobComment parent = commentRepository.findById(req.getParentId())
                        .orElseThrow(() -> new CustomException(ErrorCode.BYOB_COMMENT_NOT_FOUND));
                if (!parent.getByob().getId().equals(byobId)) throw new CustomException(ErrorCode.BYOB_COMMENT_NOT_FOUND);
                participantUser = parent.getParticipantUser();
            } else {
                participantUser = author;
            }
        } else {
            // 일반 사용자: 루트 댓글 및 답글 모두 가능
            if (req.getParentId() != null) {
                ByobComment parent = commentRepository.findById(req.getParentId())
                        .orElseThrow(() -> new CustomException(ErrorCode.BYOB_COMMENT_NOT_FOUND));
                if (!parent.getByob().getId().equals(byobId)) throw new CustomException(ErrorCode.BYOB_COMMENT_NOT_FOUND);
                participantUser = parent.getParticipantUser();
            } else {
                participantUser = author;
            }
        }

        ByobComment comment = ByobComment.builder()
                .byob(byob)
                .participantUser(participantUser)
                .author(author)
                .content(req.getContent().strip())
                .parentId(req.getParentId())
                .build();
        return ByobCommentResponse.from(commentRepository.save(comment), new ArrayList<>());
    }

    // ── 댓글 삭제 ─────────────────────────────────────────────────

    @Transactional
    public void deleteComment(Long byobId, Long commentId, Long userId) {
        ByobComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.BYOB_COMMENT_NOT_FOUND));
        if (!comment.getByob().getId().equals(byobId)) throw new CustomException(ErrorCode.BYOB_COMMENT_NOT_FOUND);
        if (!comment.getAuthor().getId().equals(userId)) throw new CustomException(ErrorCode.FORBIDDEN);
        commentRepository.delete(comment);
    }

    // ── 내가 주최한 모임 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ByobMyHostedResponse> getMyHosted(Long userId, int page, int size) {
        return byobRepository.findByHostIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(ByobMyHostedResponse::from);
    }

    // ── 내가 참여한 모임 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ByobMyJoinedResponse> getMyJoined(Long userId, int page, int size) {
        return participantRepository.findAllByUserIdOrderByAppliedAtDesc(userId, PageRequest.of(page, size))
                .map(ByobMyJoinedResponse::from);
    }

    // ── 내부 헬퍼 ─────────────────────────────────────────────────

    private Byob findByob(Long id) {
        return byobRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.BYOB_NOT_FOUND));
    }

    private User findUser(Long id) {
        return userRepository.getByIdOrThrow(id);
    }

    private ByobParticipant findParticipant(Long id) {
        return participantRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.BYOB_PARTICIPANT_NOT_FOUND));
    }

    private void checkHost(Byob byob, Long userId) {
        if (!byob.getHost().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    // BYOB 게시판 공지(고정글) 설정 권한: 최고관리자/관리자/파트너
    private boolean canPin(Role role) {
        return role == Role.SUPER_ADMIN || role == Role.ADMIN || role == Role.PARTNER;
    }
}
