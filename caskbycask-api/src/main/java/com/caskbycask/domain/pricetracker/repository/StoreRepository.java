package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {
}
