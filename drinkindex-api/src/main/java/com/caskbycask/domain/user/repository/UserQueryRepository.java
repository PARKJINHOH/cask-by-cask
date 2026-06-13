package com.caskbycask.domain.user.repository;

import com.caskbycask.domain.user.dto.UserSearchCondition;
import com.caskbycask.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserQueryRepository {

    Page<User> searchUsers(UserSearchCondition condition, Pageable pageable);
}
