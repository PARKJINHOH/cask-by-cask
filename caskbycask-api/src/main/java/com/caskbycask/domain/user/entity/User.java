package com.caskbycask.domain.user.entity;

import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.user.entity.enums.AdultVerifyMethod;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.entity.enums.SignupMethod;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_user_email", columnList = "email")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("회원")
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(unique = true, nullable = false)
    @Comment("이메일(로그인 ID)")
    private String email;

    @Column
    @Comment("비밀번호 해시")
    private String password;

    @Column(nullable = false, length = 8)
    @Comment("닉네임")
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("권한 — SUPER_ADMIN/ADMIN/MODERATOR/PARTNER/MEMBER")
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producer_id")
    @Comment("소속 생산자(producer.id, 파트너)")
    private Producer producer;

    @Builder.Default
    @Column(nullable = false)
    @Comment("활성 여부")
    private Boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    @Comment("이메일 인증 여부")
    private Boolean emailVerified = false;

    /** 가입 경로(이메일/네이버/구글) — 가입 시점 고정. 연동 현황은 user_social_account 가 별도 추적. */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("가입 경로 — EMAIL/NAVER/GOOGLE")
    private SignupMethod signupMethod = SignupMethod.EMAIL;

    @Column
    @Comment("삭제 일시(소프트삭제/탈퇴)")
    private LocalDateTime deletedAt;

    @Builder.Default
    @Column(nullable = false)
    @Comment("닉네임 고정(변경 불가) 여부")
    private Boolean nicknameFixed = false;

    @Column
    @Comment("닉네임 변경 일시")
    private LocalDateTime nicknameChangedAt;

    @Column(length = 500)
    @Comment("프로필 이미지 URL")
    private String profileImageUrl;

    @Column
    @Comment("프로필 이미지 변경 일시")
    private LocalDateTime profileImageChangedAt;

    @Column
    @Comment("이용약관 동의 일시")
    private LocalDateTime termsAgreedAt;

    @Column
    @Comment("개인정보 처리방침 동의 일시")
    private LocalDateTime privacyAgreedAt;

    /** 가입 시 동의한 이용약관 버전 (법적 증빙용 — 동의 시점의 활성 버전 스냅샷) */
    @Column(length = 50)
    @Comment("동의한 이용약관 버전")
    private String termsAgreedVersion;

    /** 가입 시 동의한 개인정보 처리방침 버전 (법적 증빙용 — 동의 시점의 활성 버전 스냅샷) */
    @Column(length = 50)
    @Comment("동의한 개인정보 처리방침 버전")
    private String privacyAgreedVersion;

    @Builder.Default
    @Column(nullable = false)
    @Comment("이메일 수신 동의 여부")
    private Boolean emailSubscribed = false;

    @Column
    @Comment("정지 해제 일시")
    private LocalDateTime suspendedUntil;

    @Column(length = 500)
    @Comment("정지 사유")
    private String suspendReason;

    /** 마지막 비밀번호 변경 시각 (90일 변경 권고 정책 기준) */
    @Column
    @Comment("비밀번호 변경 일시")
    private LocalDateTime passwordChangedAt;

    /** 마지막 로그인 시각 (휴면 전환 정책 기준) */
    @Column
    @Comment("마지막 로그인 일시")
    private LocalDateTime lastLoginAt;

    /** 휴면 계정 여부 (365일 미접속 시 전환) */
    @Builder.Default
    @Column(nullable = false)
    @Comment("휴면 여부")
    private Boolean dormant = false;

    /** 휴면 전환 시각 */
    @Column
    @Comment("휴면 전환 일시")
    private LocalDateTime dormantAt;

    /** 임시 비밀번호 발급 후 즉시 변경 강제 여부 */
    @Builder.Default
    @Column(nullable = false)
    @Comment("비밀번호 변경 필요 여부")
    private Boolean mustChangePassword = false;

    // ── 성인(연령) 인증 ─────────────────────────────────────────
    /** 성인인증 완료 여부 (만 19세 이상 확인) */
    @Builder.Default
    @Column(nullable = false)
    @Comment("성인인증 완료 여부")
    private Boolean adultVerified = false;

    /** 성인인증 완료 시각 */
    @Column
    @Comment("성인인증 완료 일시")
    private LocalDateTime adultVerifiedAt;

    /** 성인인증 방식 (SELF=자가선언, MOBILE/SOCIAL=추후 확장) */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("성인인증 방식 — SELF/MOBILE/SOCIAL")
    private AdultVerifyMethod adultVerifyMethod;

    /** 연령확인용 생년월일 (만나이 계산·법적 증빙) */
    @Column
    @Comment("생년월일(연령확인)")
    private LocalDate adultBirthDate;

    /** 성인인증 재인증 만료 시각 (현재 정책: 재인증 없음 → null 고정. 추후 정책 활성화 대비 필드) */
    @Column
    @Comment("성인인증 만료 일시")
    private LocalDateTime adultVerifyExpiresAt;

    @Builder.Default
    @Column(nullable = false)
    @Comment("숙성력(보유 점수)")
    private Integer maturingPower = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("현재 레벨")
    private Integer currentLevel = 1;

    @Builder.Default
    @Column(nullable = false)
    @Comment("연속 출석 일수")
    private Integer consecutiveAttendance = 0;

    @Column
    @Comment("마지막 출석 일자")
    private LocalDate lastAttendanceDate;

    @Column(length = 500)
    @Comment("관리자 메모(역할/권한 설명)")
    private String description;

    /** 회원별 접근 허용 관리자 메뉴 키(라우트 path). 관리자(ADMIN/SUPER_ADMIN)는 프론트에서 전체 노출. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_menu_permissions", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "menu_key", length = 255)
    @Comment("접근 허용 메뉴 키")
    @Builder.Default
    private Set<String> allowedMenus = new HashSet<>();

    /** 모더레이터 게시판 권한 (MODERATOR 역할 전용) */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_board_permissions", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "board_type", length = 20)
    @Comment("쓰기 허용 게시판 — FREE/NOTICE")
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

    /** 비밀번호 로그인 수단 보유 여부 (소셜 전용 계정은 password 가 null). */
    public boolean hasPassword() {
        return this.password != null && !this.password.isBlank();
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
        return com.caskbycask.domain.user.policy.AccountPolicy
                .isPasswordChangeRequired(this.passwordChangedAt, getCreatedAt());
    }

    /**
     * 성인인증 처리. 만나이 검증은 호출 측(서비스)에서 선행하며, 여기서는 상태만 확정한다.
     * @param birthDate 인증에 사용한 생년월일 (null 허용 — 외부 인증기관이 DOB를 제공하지 않는 경우 대비)
     * @param method    인증 방식
     */
    public void verifyAdult(LocalDate birthDate, AdultVerifyMethod method) {
        this.adultVerified = true;
        this.adultVerifiedAt = LocalDateTime.now();
        this.adultVerifyMethod = method;
        this.adultBirthDate = birthDate;
        // 현재 정책: 재인증 없음 → 만료 시각 미설정. 추후 정책 활성화 시 여기서 expiresAt 부여.
        this.adultVerifyExpiresAt = null;
    }

    /** 유효한 성인인증 보유 여부 (만료 정책 반영 — 현재는 만료 NULL이라 플래그만 평가) */
    public boolean isAdultVerified() {
        return com.caskbycask.domain.user.policy.AccountPolicy
                .isAdultVerificationValid(this.adultVerified, this.adultVerifyExpiresAt);
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.isActive = false;
    }

    public void assignProducer(Producer producer) {
        this.producer = producer;
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

    public void changeRole(Role role, Producer producer, Set<String> allowedMenus, String description) {
        this.role = role;
        this.producer = producer;
        this.description = description;
        this.allowedMenus.clear();
        if (allowedMenus != null) {
            this.allowedMenus.addAll(allowedMenus);
        }
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
