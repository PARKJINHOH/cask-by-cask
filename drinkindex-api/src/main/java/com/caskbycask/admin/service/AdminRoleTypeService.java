package com.caskbycask.admin.service;

import com.caskbycask.domain.user.dto.CreateRoleTypeRequest;
import com.caskbycask.domain.user.dto.RoleTypeResponse;
import com.caskbycask.domain.user.dto.UpdateRoleTypeRequest;
import com.caskbycask.domain.user.entity.RoleType;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.RoleTypeRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminRoleTypeService {

    private final RoleTypeRepository roleTypeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<RoleTypeResponse> getAll() {
        return roleTypeRepository.findAllByOrderBySortOrderAscNameAsc()
                .stream().map(RoleTypeResponse::from).toList();
    }

    @Transactional
    public RoleTypeResponse create(CreateRoleTypeRequest request) {
        validateSystemRole(request.systemRole());
        if (roleTypeRepository.existsByName(request.name())) {
            throw new CustomException(ErrorCode.DUPLICATE_VALUE);
        }
        RoleType roleType = RoleType.builder()
                .name(request.name())
                .description(request.description())
                .systemRole(request.systemRole())
                .allowedMenus(request.allowedMenus() != null
                        ? new HashSet<>(request.allowedMenus()) : new HashSet<>())
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                .build();
        return RoleTypeResponse.from(roleTypeRepository.save(roleType));
    }

    @Transactional
    public RoleTypeResponse update(Long id, UpdateRoleTypeRequest request) {
        RoleType roleType = find(id);
        if (roleTypeRepository.existsByNameAndIdNot(request.name(), id)) {
            throw new CustomException(ErrorCode.DUPLICATE_VALUE);
        }
        roleType.update(
                request.name(),
                request.description(),
                new HashSet<>(request.allowedMenus()),
                request.isActive(),
                request.sortOrder()
        );
        return RoleTypeResponse.from(roleType);
    }

    @Transactional
    public void delete(Long id) {
        RoleType roleType = find(id);
        if (userRepository.existsByRoleType(roleType)) {
            throw new CustomException(ErrorCode.ROLE_TYPE_IN_USE);
        }
        roleTypeRepository.delete(roleType);
    }

    private RoleType find(Long id) {
        return roleTypeRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
    }

    private void validateSystemRole(Role role) {
        if (role == Role.SUPER_ADMIN || role == Role.MEMBER) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }
}
