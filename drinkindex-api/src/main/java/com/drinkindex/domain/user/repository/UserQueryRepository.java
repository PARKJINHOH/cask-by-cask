package com.drinkindex.domain.user.repository;

import com.drinkindex.domain.user.dto.UserSearchCondition;
import com.drinkindex.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserQueryRepository {

    Page<User> searchUsers(UserSearchCondition condition, Pageable pageable);
}
