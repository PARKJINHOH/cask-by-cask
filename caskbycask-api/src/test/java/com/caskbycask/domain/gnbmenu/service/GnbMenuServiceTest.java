package com.caskbycask.domain.gnbmenu.service;

import com.caskbycask.domain.gnbmenu.entity.GnbMenuSetting;
import com.caskbycask.domain.gnbmenu.repository.GnbMenuSettingRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * GNB 메뉴 노출 설정의 저장 규칙을 못 박는다.
 *
 * 메뉴 목록은 프론트 카탈로그가 소유하고 DB 에는 "숨김"만 남기므로, 여기가 틀리면
 * 관리자가 끈 메뉴가 되살아나거나 같은 키의 행이 중복으로 쌓인다 — 둘 다 화면을
 * 열어 보기 전에는 드러나지 않는다.
 */
class GnbMenuServiceTest {

    private GnbMenuSettingRepository repository;
    private GnbMenuService service;

    @BeforeEach
    void setUp() {
        repository = mock(GnbMenuSettingRepository.class);
        service = new GnbMenuService(repository);
    }

    @Test
    void hidingUnknownKeyCreatesRow() {
        // 행이 없는 키는 노출이 기본값이므로, 처음 숨길 때 행이 새로 생겨야 한다.
        when(repository.findByMenuKey("youtubeGallery")).thenReturn(Optional.empty());

        service.updateVisibility("youtubeGallery", false);

        verify(repository).save(any(GnbMenuSetting.class));
    }

    @Test
    void togglingExistingKeyUpdatesSameRowWithoutInsert() {
        // 같은 키로 두 번째 저장이 들어와도 행이 늘어나면 안 된다 (menu_key 는 UNIQUE).
        GnbMenuSetting existing = GnbMenuSetting.builder()
                .menuKey("notice")
                .isVisible(false)
                .build();
        when(repository.findByMenuKey("notice")).thenReturn(Optional.of(existing));

        service.updateVisibility("notice", true);

        assertThat(existing.getIsVisible()).isTrue();
        verify(repository, never()).save(any(GnbMenuSetting.class));
    }

    @Test
    void hiddenMenuKeysReturnOnlyHiddenRows() {
        when(repository.findByIsVisibleFalse()).thenReturn(List.of(
                GnbMenuSetting.builder().menuKey("photoCard").isVisible(false).build(),
                GnbMenuSetting.builder().menuKey("tierList").isVisible(false).build()
        ));

        assertThat(service.getHiddenMenuKeys()).containsExactly("photoCard", "tierList");
    }

    @Test
    void malformedMenuKeyIsRejected() {
        // menuKey 는 PathVariable 로 들어온다 — 형식을 안 걸면 임의 문자열이 그대로 행이 된다.
        assertThatThrownBy(() -> service.updateVisibility("../etc/passwd", false))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_INPUT);

        assertThatThrownBy(() -> service.updateVisibility("", false))
                .isInstanceOf(CustomException.class);

        verify(repository, never()).save(any(GnbMenuSetting.class));
    }

    @Test
    void hyphenAndUnderscoreKeysAreAccepted() {
        // 카탈로그 키는 보통 camelCase 지만 경로를 따라 'price-tracker' 처럼 짓는 쪽이
        // 자연스러운 경우가 있다. 이를 막으면 메뉴는 멀쩡히 뜨는데 숨기려 할 때만 실패해
        // 원인을 찾기 어렵다 — 형식 검사는 경로 조작만 막고 작명은 카탈로그에 맡긴다.
        when(repository.findByMenuKey("price-tracker")).thenReturn(Optional.empty());
        when(repository.findByMenuKey("taste_tree")).thenReturn(Optional.empty());

        service.updateVisibility("price-tracker", false);
        service.updateVisibility("taste_tree", false);

        verify(repository, times(2)).save(any(GnbMenuSetting.class));
    }

    @Test
    void nullVisibilityIsRejected() {
        // 바디가 비어 오면 isVisible 이 null 이다 — NOT NULL 컬럼이라 그대로 두면 500 이 난다.
        assertThatThrownBy(() -> service.updateVisibility("notice", null))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_INPUT);
    }
}
