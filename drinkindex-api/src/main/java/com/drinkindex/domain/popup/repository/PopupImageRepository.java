package com.drinkindex.domain.popup.repository;

import com.drinkindex.domain.popup.entity.PopupImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PopupImageRepository extends JpaRepository<PopupImage, Long> {

    List<PopupImage> findByPopupId(Long popupId);

    List<PopupImage> findByPopupIdAndIsUsedTrue(Long popupId);

    Optional<PopupImage> findByImageUrl(String imageUrl);

    Optional<PopupImage> findBySavedFileName(String savedFileName);
}
