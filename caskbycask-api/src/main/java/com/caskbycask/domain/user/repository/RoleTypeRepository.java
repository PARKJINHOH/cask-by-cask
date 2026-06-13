package com.caskbycask.domain.user.repository;

import com.caskbycask.domain.user.entity.RoleType;
import com.caskbycask.domain.user.entity.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoleTypeRepository extends JpaRepository<RoleType, Long> {
    List<RoleType> findAllByOrderBySortOrderAscNameAsc();
    List<RoleType> findBySystemRoleOrderBySortOrderAscNameAsc(Role systemRole);
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name, Long id);
}
