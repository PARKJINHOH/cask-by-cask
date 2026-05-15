package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.DeletedPost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeletedPostRepository extends JpaRepository<DeletedPost, Long> {
}
