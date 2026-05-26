package com.drinkindex.domain.bottlecollection.repository;

import com.drinkindex.domain.bottlecollection.entity.UserBottle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserBottleRepository extends JpaRepository<UserBottle, Long> {
}
