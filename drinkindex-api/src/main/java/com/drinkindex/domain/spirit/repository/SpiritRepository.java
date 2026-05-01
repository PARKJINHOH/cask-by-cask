package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpiritRepository extends JpaRepository<Spirit, Long>, SpiritQueryRepository {

    Optional<Spirit> findByIdAndStatus(Long id, SpiritStatus status);
}
