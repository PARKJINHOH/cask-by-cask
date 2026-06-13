package com.caskbycask.domain.bottlecollection.repository;

import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserBottleRepository extends JpaRepository<UserBottle, Long> {
}
