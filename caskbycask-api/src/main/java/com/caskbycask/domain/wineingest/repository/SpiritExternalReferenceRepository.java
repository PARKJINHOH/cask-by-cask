package com.caskbycask.domain.wineingest.repository;

import com.caskbycask.domain.wineingest.entity.SpiritExternalReference;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpiritExternalReferenceRepository extends JpaRepository<SpiritExternalReference, Long> {
    boolean existsByProviderAndExternalWineIdAndExternalVintageId(
            String provider, String externalWineId, String externalVintageId);
    boolean existsByIdentityKey(String identityKey);
}
