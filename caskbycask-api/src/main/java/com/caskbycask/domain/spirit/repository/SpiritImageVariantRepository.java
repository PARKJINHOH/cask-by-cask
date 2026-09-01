package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.entity.SpiritImageVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SpiritImageVariantRepository extends JpaRepository<SpiritImageVariant, Long> {

    /** 갤러리 한 벌의 지정을 한 번에 읽는다 — 이미지마다 조회하면 N+1 이 된다. */
    List<SpiritImageVariant> findBySpiritImageIdIn(Collection<Long> spiritImageIds);

    /** 이미지 한 장 삭제 시 정리 */
    void deleteBySpiritImageId(Long spiritImageId);

    /** 주류의 이미지 전체 삭제 시 정리 */
    void deleteBySpiritImageIdIn(Collection<Long> spiritImageIds);

    /** 에디션이 영구 삭제될 때, 그 에디션을 가리키던 지정 정리 */
    void deleteBySpiritId(Long spiritId);
}
