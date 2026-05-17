package com.drinkindex.domain.user.entity;

import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Column(nullable = false, length = 100)
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
    private Integer maturingPower = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer currentLevel = 1;

    @Builder.Default
    @Column(nullable = false)
    private Integer consecutiveAttendance = 0;

    @Column
    private LocalDate lastAttendanceDate;

    public void verifyEmail() {
        this.emailVerified = true;
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
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

    public void changeRole(Role role, Distillery distillery) {
        this.role = role;
        this.distillery = distillery;
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
}
