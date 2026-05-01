package com.drinkindex.admin.service;

import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.distillery.repository.DistilleryRepository;
import com.drinkindex.domain.user.dto.AdminUserResponse;
import com.drinkindex.domain.user.dto.ChangeRoleRequest;
import com.drinkindex.domain.user.dto.CreateDistilleryManagerRequest;
import com.drinkindex.domain.user.dto.UserSearchCondition;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final DistilleryRepository distilleryRepository;
    private final PasswordEncoder passwordEncoder;

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

    // ── 계정 비활성화 ──────────────────────────────────────

    @Transactional
    public void deactivateUser(Long id) {
        findUser(id).deactivate();
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
