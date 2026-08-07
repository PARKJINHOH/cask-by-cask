package com.caskbycask.domain.wineingest.repository;

import com.caskbycask.domain.wineingest.entity.SpiritExternalReference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpiritExternalReferenceRepository extends JpaRepository<SpiritExternalReference, Long> {
    boolean existsByProviderAndExternalWineIdAndExternalVintageId(
            String provider, String externalWineId, String externalVintageId);
    boolean existsByIdentityKey(String identityKey);

    /** 생산자를 모르는 와인의 마스터를 같은 외부 와인 ID로 찾을 때 쓴다. */
    Optional<SpiritExternalReference> findFirstByProviderAndExternalWineIdOrderByIdAsc(
            String provider, String externalWineId);
}
