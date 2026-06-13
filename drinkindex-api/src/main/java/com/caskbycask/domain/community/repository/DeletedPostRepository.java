package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.DeletedPost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeletedPostRepository extends JpaRepository<DeletedPost, Long> {
}
