package com.caskbycask.domain.gnbmenu.dto;

import com.caskbycask.domain.gnbmenu.entity.GnbMenuSetting;

public record AdminGnbMenuResponse(
        String menuKey,
        Boolean isVisible
) {
    public static AdminGnbMenuResponse from(GnbMenuSetting setting) {
        return new AdminGnbMenuResponse(setting.getMenuKey(), setting.getIsVisible());
    }
}
