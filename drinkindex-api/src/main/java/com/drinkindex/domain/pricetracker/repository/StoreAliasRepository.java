package com.drinkindex.domain.pricetracker.repository;

import com.drinkindex.domain.pricetracker.entity.StoreAlias;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreAliasRepository extends JpaRepository<StoreAlias, Long> {

    List<StoreAlias> findByStoreId(Long storeId);
}
