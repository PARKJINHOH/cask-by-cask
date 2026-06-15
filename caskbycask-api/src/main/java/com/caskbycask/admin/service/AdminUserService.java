package com.caskbycask.admin.service;

import com.caskbycask.domain.admin.entity.enums.AdminLogTargetType;
import com.caskbycask.domain.admin.entity.enums.AdminLogType;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.user.dto.AdminUserResponse;
import com.caskbycask.domain.user.dto.ChangeRoleRequest;
import com.caskbycask.domain.user.dto.CreateProducerManagerRequest;
import com.caskbycask.domain.user.dto.SuspendUserRequest;
import com.caskbycask.domain.user.dto.UpdateBoardPermissionsRequest;
import com.caskbycask.domain.user.dto.UserSearchCondition;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.auth.security.AuthUserCache;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일");

    private final UserRepository userRepository;
    private final ProducerRepository producerRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final AdminLogService adminLogService;
    private final AuthUserCache authUserCache;

    // ── 회원 목록 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> searchUsers(String keyword, Role role, Boolean isActive,
                                               Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        String kw = StringUtils.hasText(keyword) ? keyword.trim() : null;
        return userRepository.searchUsers(new UserSearchCondition(kw, role, isActive), sorted)
                .map(AdminUserResponse::from);
    }

    // ── 회원 상세 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public AdminUserResponse getUser(Long id) {
        return AdminUserResponse.from(findUser(id));
    }

    // ── 역할 변경 ──────────────────────────────────────────

    @Transactional
    public AdminUserResponse changeRole(Long id, ChangeRoleRequest request, Long actorId) {
        User actor = findUser(actorId);
        User target = findUser(id);

        checkCanModify(actor, target);

        if (request.role() == Role.SUPER_ADMIN) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String oldRoleName = buildRoleName(target);

        Producer producer = null;
        if (request.producerId() != null) {
            producer = producerRepository.findById(request.producerId())
                    .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
        }

        // 관리자(SUPER_ADMIN/ADMIN)는 전체 메뉴 접근 → allowedMenus 미저장. 비관리자만 체크한 메뉴 저장.
        Set<String> allowedMenus = (request.role() == Role.ADMIN)
                ? new HashSet<>()
                : (request.allowedMenus() != null ? new HashSet<>(request.allowedMenus()) : new HashSet<>());

        target.changeRole(request.role(), producer, allowedMenus, request.description());

        String newRoleName = buildRoleName(target);
        adminLogService.record(actor, AdminLogType.ROLE_CHANGE,
                AdminLogTargetType.USER, target.getId(),
                String.format("[%s] 역할 변경: %s → %s", target.getNickname(), oldRoleName, newRoleName),
                String.format("{\"oldRole\":\"%s\",\"newRole\":\"%s\"}", oldRoleName, newRoleName));

        authUserCache.evict(target.getId());   // 권한 변경 즉시 반영
        return AdminUserResponse.from(target);
    }

    // ── 모더레이터 게시판 권한 ──────────────────────────────

    @Transactional
    public AdminUserResponse updateBoardPermissions(Long id, UpdateBoardPermissionsRequest request,
                                                     Long actorId) {
        User target = findUser(id);
        if (target.getRole() != Role.MODERATOR) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        // 모더레이터는 자유게시판만 허용
        Set<BoardType> allowed = request.boardTypes().stream()
                .filter(bt -> bt == BoardType.FREE)
                .collect(Collectors.toSet());
        target.updateBoardPermissions(allowed);
        return AdminUserResponse.from(target);
    }

    // ── 계정 비활성화 / 활성화 / 삭제 ────────────────────────

    @Transactional
    public void deactivateUser(Long id, Long actorId) {
        User actor = findUser(actorId);
        User target = findUser(id);
        checkCanModify(actor, target);
        target.deactivate();
        authUserCache.evict(target.getId());   // 비활성화 즉시 반영 (로그인된 세션 차단)
    }

    @Transactional
    public void activateUser(Long id, Long actorId) {
        User actor = findUser(actorId);
        User target = findUser(id);
        checkCanModify(actor, target);
        target.activate();
        authUserCache.evict(target.getId());   // 재활성화 즉시 반영
    }

    @Transactional
    public void deleteUser(Long id, Long actorId) {
        User actor = findUser(actorId);
        User target = findUser(id);
        checkCanModify(actor, target);

        adminLogService.record(actor, AdminLogType.ACCOUNT_DELETE,
                AdminLogTargetType.USER, target.getId(),
                String.format("[%s] 계정 삭제", target.getNickname()),
                String.format("{\"email\":\"%s\",\"role\":\"%s\"}", target.getEmail(), target.getRole()));

        authUserCache.evict(target.getId());   // 삭제 즉시 반영
        userRepository.delete(target);
    }

    // ── 계정 징계 ──────────────────────────────────────────

    @Transactional
    public void suspendUser(Long id, SuspendUserRequest request, Long actorId) {
        User actor = findUser(actorId);
        User target = findUser(id);
        checkCanModify(actor, target);

        LocalDateTime until = LocalDateTime.now().plusDays(request.days());
        target.suspend(until, request.reason());

        adminLogService.record(actor, AdminLogType.ACCOUNT_SUSPEND,
                AdminLogTargetType.USER, target.getId(),
                String.format("[%s] 계정 정지 %d일 (사유: %s)", target.getNickname(), request.days(), request.reason()),
                String.format("{\"days\":%d,\"until\":\"%s\",\"reason\":\"%s\"}",
                        request.days(), until, request.reason()));

        try {
            emailSender.sendHtml(target.getEmail(), "[CaskByCask] 계정 이용 정지 안내",
                    buildSuspensionEmail(target.getNickname(), request.days(), until, request.reason()));
        } catch (Exception e) {
            log.warn("징계 이메일 발송 실패: userId={}", id, e);
        }
    }

    // ── 증류소 담당자 계정 생성 ────────────────────────────

    @Transactional
    public AdminUserResponse createProducerManager(CreateProducerManagerRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        if (userRepository.existsByNickname(request.nickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }
        Producer producer = producerRepository.findById(request.producerId())
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .role(Role.PARTNER)
                .producer(producer)
                .build();
        return AdminUserResponse.from(userRepository.save(user));
    }

    // ── 권한 체크 ──────────────────────────────────────────

    /**
     * ADMIN은 SUPER_ADMIN 또는 다른 ADMIN 계정을 수정할 수 없다.
     * SUPER_ADMIN은 제한 없음.
     */
    private void checkCanModify(User actor, User target) {
        if (actor.getRole() == Role.SUPER_ADMIN) return;
        if (target.getRole() == Role.SUPER_ADMIN || target.getRole() == Role.ADMIN) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────

    private String buildRoleName(User user) {
        return user.getRole().name();
    }

    private String buildSuspensionEmail(String nickname, int days, LocalDateTime until, String reason) {
        return """
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
                  <h2 style="color:#b45309">계정 이용 정지 안내</h2>
                  <p>안녕하세요, <strong>%s</strong>님.</p>
                  <p>회원님의 계정이 운영 정책에 따라 <strong>%d일</strong> 동안 이용 정지 처리되었습니다.</p>
                  <table style="border-collapse:collapse;width:100%%;margin:16px 0">
                    <tr>
                      <th style="text-align:left;padding:8px;background:#fef3c7;border:1px solid #fcd34d;width:120px">정지 해제일</th>
                      <td style="padding:8px;border:1px solid #fcd34d">%s</td>
                    </tr>
                    <tr>
                      <th style="text-align:left;padding:8px;background:#fef3c7;border:1px solid #fcd34d">사유</th>
                      <td style="padding:8px;border:1px solid #fcd34d">%s</td>
                    </tr>
                  </table>
                  <p style="color:#6b7280;font-size:13px">정지 기간 동안 로그인이 제한됩니다. 문의사항이 있으시면 고객센터로 연락해 주세요.</p>
                </div>
                """.formatted(nickname, days, until.format(DATE_FMT), reason);
    }

    private User findUser(Long id) {
        return userRepository.getByIdOrThrow(id);
    }
}
