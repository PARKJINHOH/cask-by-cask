package com.drinkindex.domain.user.entity;

import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_user_email", columnList = "email"),
                @Index(name = "idx_user_oauth", columnList = "oauth_provider, oauth_id")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column
    private String password;

    @Column(nullable = false, length = 8)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "distillery_id")
    private Distillery distillery;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean emailVerified = false;

    @Column(length = 50)
    private String oauthProvider;

    @Column(length = 255)
    private String oauthId;

    @Column
    private LocalDateTime deletedAt;

    @Builder.Default
    @Column(nullable = false)
    private Boolean nicknameFixed = false;

    @Column
    private LocalDateTime nicknameChangedAt;

    @Column(length = 500)
    private String profileImageUrl;

    @Column
    private LocalDateTime profileImageChangedAt;

    @Column
    private LocalDateTime termsAgreedAt;

    @Column
    private LocalDateTime privacyAgreedAt;

    @Builder.Default
    @Column(nullable = false)
    private Boolean emailSubscribed = false;

    @Column
    private LocalDateTime suspendedUntil;

    @Column(length = 500)
    private String suspendReason;

    @Builder.Default
    @Column(nullable = false)
    private Integer maturingPower = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer currentLevel = 1;

    @Builder.Default
    @Column(nullable = false)
    private Integer consecutiveAttendance = 0;

    @Column
    private LocalDate lastAttendanceDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_type_id")
    private RoleType roleType;

    /** 모더레이터 게시판 권한 (MODERATOR 역할 전용) */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_board_permissions", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "board_type", length = 20)
    @Builder.Default
    private Set<BoardType> boardPermissions = new HashSet<>();

    public void verifyEmail() {
        this.emailVerified = true;
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
        this.nicknameChangedAt = LocalDateTime.now();
    }

    public void fixNickname() {
        this.nicknameFixed = true;
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.isActive = false;
    }

    public void assignDistillery(Distillery distillery) {
        this.distillery = distillery;
    }

    public void deactivate() {
        this.isActive = false;
    }

    public void activate() {
        this.isActive = true;
    }

    public void suspend(LocalDateTime until, String reason) {
        this.suspendedUntil = until;
        this.suspendReason = reason;
    }

    public void changeRole(Role role, Distillery distillery, RoleType roleType) {
        this.role = role;
        this.distillery = distillery;
        this.roleType = roleType;
    }

    public void addMaturingPower(int delta) {
        this.maturingPower = Math.max(0, this.maturingPower + delta);
    }

    public void updateLevel(int level) {
        this.currentLevel = level;
    }

    public void updateAttendance(LocalDate date, int streak) {
        this.lastAttendanceDate = date;
        this.consecutiveAttendance = streak;
    }

    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
        this.profileImageChangedAt = LocalDateTime.now();
    }

    public void removeProfileImage() {
        this.profileImageUrl = null;
    }

    public void updateEmailSubscription(boolean emailSubscribed) {
        this.emailSubscribed = emailSubscribed;
    }

    public void updateBoardPermissions(Set<BoardType> boards) {
        this.boardPermissions.clear();
        this.boardPermissions.addAll(boards);
    }
}
