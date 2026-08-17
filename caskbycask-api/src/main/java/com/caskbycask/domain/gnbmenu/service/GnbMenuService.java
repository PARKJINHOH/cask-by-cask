package com.caskbycask.domain.gnbmenu.service;

import com.caskbycask.domain.gnbmenu.dto.AdminGnbMenuResponse;
import com.caskbycask.domain.gnbmenu.entity.GnbMenuSetting;
import com.caskbycask.domain.gnbmenu.repository.GnbMenuSettingRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class GnbMenuService {

    /**
     * 메뉴 키는 프론트 카탈로그가 정하므로 백엔드는 목록을 모른다. 대신 형식만 걸러
     * 경로에 실려 온 임의의 문자열이 그대로 행이 되는 것을 막는다. (컬럼 길이 50 과 맞춤)
     * <p>
     * 하이픈·언더스코어를 허용한다 — 카탈로그 키는 보통 camelCase 지만 경로를 따라
     * {@code price-tracker} 처럼 짓는 것이 자연스러운 경우가 있다. 이를 막으면 메뉴는
     * 멀쩡히 뜨는데 관리자가 숨기려 할 때만 실패해, 원인을 찾기 어려운 형태로 드러난다.
     */
    private static final Pattern MENU_KEY_PATTERN = Pattern.compile("^[A-Za-z][A-Za-z0-9_-]{0,49}$");

    private final GnbMenuSettingRepository gnbMenuSettingRepository;

    /** 숨김 처리된 메뉴 키 목록. 행이 없는 키는 노출이므로 여기에 담기지 않는다. */
    @Transactional(readOnly = true)
    public List<String> getHiddenMenuKeys() {
        return gnbMenuSettingRepository.findByIsVisibleFalse().stream()
                .map(GnbMenuSetting::getMenuKey)
                .toList();
    }

    /**
     * 저장된 설정 행 전체. 카탈로그에 있으나 행이 없는 키는 여기에 없다 —
     * 관리자 화면이 카탈로그를 기준으로 삼고 이 결과를 덮어씌워 병합한다.
     */
    @Transactional(readOnly = true)
    public List<AdminGnbMenuResponse> getAllForAdmin() {
        return gnbMenuSettingRepository.findAll().stream()
                .map(AdminGnbMenuResponse::from)
                .toList();
    }

    /** 노출 여부 저장. 행이 없으면 만들고, 있으면 더티 체킹으로 갱신한다. */
    @Transactional
    public void updateVisibility(String menuKey, Boolean isVisible) {
        if (menuKey == null || !MENU_KEY_PATTERN.matcher(menuKey).matches()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (isVisible == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        gnbMenuSettingRepository.findByMenuKey(menuKey)
                .ifPresentOrElse(
                        setting -> setting.setVisible(isVisible),
                        () -> gnbMenuSettingRepository.save(
                                GnbMenuSetting.builder()
                                        .menuKey(menuKey)
                                        .isVisible(isVisible)
                                        .build()
                        )
                );
    }
}
