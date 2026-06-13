package com.caskbycask.domain.user.entity;

import com.caskbycask.domain.user.entity.enums.AdminMenuKey;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "role_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class RoleType extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    /** ADMIN 또는 PARTNER 만 허용 */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role systemRole;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_type_allowed_menus", joinColumns = @JoinColumn(name = "role_type_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "menu_key", length = 50)
    @Builder.Default
    private Set<AdminMenuKey> allowedMenus = new HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
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
