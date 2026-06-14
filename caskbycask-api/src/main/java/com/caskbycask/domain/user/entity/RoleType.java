package com.caskbycask.domain.user.entity;

import com.caskbycask.domain.user.entity.enums.AdminMenuKey;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "role_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("역할(권한 그룹)")
public class RoleType extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, length = 100)
    @Comment("역할명")
    private String name;

    @Column(length = 500)
    @Comment("역할 설명")
    private String description;

    /** ADMIN 또는 PARTNER 만 허용 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("시스템 역할 — SUPER_ADMIN/ADMIN/MODERATOR/PARTNER/MEMBER")
    private Role systemRole;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_type_allowed_menus", joinColumns = @JoinColumn(name = "role_type_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "menu_key", length = 50)
    @Comment("허용 메뉴 — PRODUCERS/PRODUCER_REQUESTS/SPIRITS/SPIRIT_REQUESTS")
    @Builder.Default
    private Set<AdminMenuKey> allowedMenus = new HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 여부")
    private Boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    public void update(String name, String description, Set<AdminMenuKey> allowedMenus,
                       Boolean isActive, Integer sortOrder) {
        this.name = name;
        this.description = description;
        this.allowedMenus.clear();
        this.allowedMenus.addAll(allowedMenus);
        this.isActive = isActive;
        this.sortOrder = sortOrder;
    }
}
