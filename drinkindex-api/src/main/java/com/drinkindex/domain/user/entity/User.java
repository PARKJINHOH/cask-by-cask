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

    /** 가입 시 동의한 이용약관 버전 (법적 증빙용 — 동의 시점의 활성 버전 스냅샷) */
    @Column(length = 50)
    private String termsAgreedVersion;

    /** 가입 시 동의한 개인정보 처리방침 버전 (법적 증빙용 — 동의 시점의 활성 버전 스냅샷) */
    @Column(length = 50)
    private String privacyAgreedVersion;

    @Builder.Default
    @Column(nullable = false)
    private Boolean emailSubscribed = false;

    @Column
    private LocalDateTime suspendedUntil;

    @Column(length = 500)
    private String suspendReason;

    /** 마지막 비밀번호 변경 시각 (90일 변경 권고 정책 기준) */
    @Column
    private LocalDateTime passwordChangedAt;

    /** 마지막 로그인 시각 (휴면 전환 정책 기준) */
    @Column
    private LocalDateTime lastLoginAt;

    /** 휴면 계정 여부 (365일 미접속 시 전환) */
    @Builder.Default
    @Column(nullable = false)
    private Boolean dormant = false;

    /** 휴면 전환 시각 */
    @Column
    private LocalDateTime dormantAt;

    /** 임시 비밀번호 발급 후 즉시 변경 강제 여부 */
    @Builder.Default
    @Column(nullable = false)
    private Boolean mustChangePassword = false;

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
        this.passwordChangedAt = LocalDateTime.now();
        this.mustChangePassword = false;
    }

    /** 임시 비밀번호 발급 — 다음 로그인 시 비밀번호 변경 강제 */
    public void requirePasswordChange() {
        this.mustChangePassword = true;
    }

    /** 로그인 성공 시 마지막 로그인 시각 갱신 */
    public void recordLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }

    /** 휴면 전환 */
    public void markDormant() {
        this.dormant = true;
        this.dormantAt = LocalDateTime.now();
    }

    /** 휴면 해제 (이메일 재인증 후) */
    public void reactivate() {
        this.dormant = false;
        this.dormantAt = null;
        this.lastLoginAt = LocalDateTime.now();
    }

    /** 90일 이상 비밀번호 미변경 — 변경 권고 대상 여부 */
    public boolean isPasswordChangeRequired() {
        return com.drinkindex.domain.user.policy.AccountPolicy
                .isPasswordChangeRequired(this.passwordChangedAt, getCreatedAt());
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
