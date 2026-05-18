package com.drinkindex.admin.service;

import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.distillery.repository.DistilleryRepository;
import com.drinkindex.domain.user.dto.AdminUserResponse;
import com.drinkindex.domain.user.dto.ChangeRoleRequest;
import com.drinkindex.domain.user.dto.CreateDistilleryManagerRequest;
import com.drinkindex.domain.user.dto.SuspendUserRequest;
import com.drinkindex.domain.user.dto.UserSearchCondition;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.email.EmailSender;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일");

    private final UserRepository userRepository;
    private final DistilleryRepository distilleryRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;

    // ── 회원 목록 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> searchUsers(String keyword, Role role, Boolean isActive,
                                               Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        String kw = StringUtils.hasText(keyword) ? keyword.trim() : null;
        UserSearchCondition condition = new UserSearchCondition(kw, role, isActive);
        return userRepository.searchUsers(condition, sorted)
                .map(AdminUserResponse::from);
    }

    // ── 회원 상세 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public AdminUserResponse getUser(Long id) {
        return AdminUserResponse.from(findUser(id));
    }

    // ── 역할 변경 ──────────────────────────────────────────

    @Transactional
    public AdminUserResponse changeRole(Long id, ChangeRoleRequest request) {
        User user = findUser(id);

        Distillery distillery = null;
        if (request.role() == Role.DISTILLERY) {
            if (request.distilleryId() == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            distillery = distilleryRepository.findById(request.distilleryId())
                    .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));
        }

        user.changeRole(request.role(), distillery);
        return AdminUserResponse.from(user);
    }

    // ── 계정 비활성화 / 활성화 / 삭제 ────────────────────────

    @Transactional
    public void deactivateUser(Long id) {
        findUser(id).deactivate();
    }

    @Transactional
    public void activateUser(Long id) {
        findUser(id).activate();
    }

    @Transactional
    public void deleteUser(Long id) {
        userRepository.delete(findUser(id));
    }

    // ── 계정 징계 ──────────────────────────────────────────

    @Transactional
    public void suspendUser(Long id, SuspendUserRequest request) {
        User user = findUser(id);
        LocalDateTime until = LocalDateTime.now().plusDays(request.days());
        user.suspend(until, request.reason());

        try {
            emailSender.sendHtml(user.getEmail(), "[DrinkIndex] 계정 이용 정지 안내",
                    buildSuspensionEmail(user.getNickname(), request.days(), until, request.reason()));
        } catch (Exception e) {
            log.warn("징계 이메일 발송 실패: userId={}", id, e);
        }
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

    // ── 증류소 담당자 계정 생성 ────────────────────────────

    @Transactional
    public AdminUserResponse createDistilleryManager(CreateDistilleryManagerRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        if (userRepository.existsByNickname(request.nickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }

        Distillery distillery = distilleryRepository.findById(request.distilleryId())
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .role(Role.DISTILLERY)
                .distillery(distillery)
                .build();

        return AdminUserResponse.from(userRepository.save(user));
    }

    // ── Private helpers ────────────────────────────────────

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
