package com.caskbycask.domain.gnbmenu.repository;

import com.caskbycask.domain.gnbmenu.entity.GnbMenuSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GnbMenuSettingRepository extends JpaRepository<GnbMenuSetting, Long> {

    /** 숨김 처리된 행만. 공개 API 가 이 결과의 키만 내려준다. */
    List<GnbMenuSetting> findByIsVisibleFalse();

    Optional<GnbMenuSetting> findByMenuKey(String menuKey);
}
