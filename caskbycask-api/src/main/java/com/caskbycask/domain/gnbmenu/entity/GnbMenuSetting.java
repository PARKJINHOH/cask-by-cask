package com.caskbycask.domain.gnbmenu.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 사용자 화면 상단 GNB 메뉴의 노출 설정.
 *
 * <p>메뉴 목록·경로·번역키는 프론트엔드 카탈로그(gnbMenu.ts)가 소유하고, 이 테이블은
 * "어떤 키를 숨길지"만 담는다. 그래서 <b>행이 없으면 노출</b>이 기본값이고,
 * 코드에 메뉴를 추가해도 마이그레이션 없이 바로 보인다.
 *
 * <p>{@code menuKey} 는 프론트 카탈로그의 키 문자열이다. 백엔드는 어떤 키가 유효한지 모른다 —
 * 관리자 메뉴 권한({@code User.allowedMenus})이 라우트 경로 문자열을 그대로 쓰는 것과 같은 방식이다.
 */
@Entity
@Table(
        name = "gnb_menu_settings",
        uniqueConstraints = @UniqueConstraint(name = "ux_gnb_menu_settings_key", columnNames = "menu_key")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("사용자 GNB 메뉴 노출 설정")
public class GnbMenuSetting extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(name = "menu_key", nullable = false, length = 50)
    @Comment("프론트 GNB 카탈로그의 메뉴 키")
    private String menuKey;

    @Builder.Default
    @Column(name = "is_visible", nullable = false)
    @Comment("노출 여부")
    private Boolean isVisible = true;

    public void setVisible(Boolean isVisible) { this.isVisible = isVisible; }
}
