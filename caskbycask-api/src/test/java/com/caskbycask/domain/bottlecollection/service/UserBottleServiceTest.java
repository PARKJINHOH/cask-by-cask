package com.caskbycask.domain.bottlecollection.service;

import com.caskbycask.domain.bottlecollection.dto.UserBottleRequest;
import com.caskbycask.domain.bottlecollection.dto.UserBottleResponse;
import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.bottlecollection.repository.UserBottleQueryRepository;
import com.caskbycask.domain.bottlecollection.repository.UserBottleRepository;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class UserBottleServiceTest {

    @Mock UserBottleRepository userBottleRepository;
    @Mock UserBottleQueryRepository userBottleQueryRepository;
    @Mock UserRepository userRepository;
    @Mock SpiritRepository spiritRepository;
    @InjectMocks UserBottleService userBottleService;

    @Test
    @DisplayName("바틀 등록 - 자유 텍스트 이름으로 등록 성공")
    void createBottle_freeText_success() {
        User user = mock(User.class);
        given(userRepository.getByIdOrThrow(1L)).willReturn(user);

        UserBottleRequest req = new UserBottleRequest(
            null, "글렌드로낙 18년", SpiritCategory.WHISKY,
            LocalDate.of(2025, 12, 5), null, null,
            220000, "대만-가품양주", BottleStatus.OPENED, true, null
        );

        UserBottle saved = UserBottle.builder()
            .user(user).spiritNameText("글렌드로낙 18년")
            .category(SpiritCategory.WHISKY).purchaseDate(LocalDate.of(2025, 12, 5))
            .price(220000).store("대만-가품양주").status(BottleStatus.OPENED)
            .isPublic(true).build();
        ReflectionTestUtils.setField(saved, "id", 1L);
        given(userBottleRepository.save(any())).willReturn(saved);

        UserBottleResponse resp = userBottleService.createBottle(1L, req);

        assertThat(resp.spiritNameText()).isEqualTo("글렌드로낙 18년");
        assertThat(resp.isPublic()).isTrue();
        then(userBottleRepository).should().save(any(UserBottle.class));
    }

    @Test
    @DisplayName("타인 바틀 삭제 시 BOTTLE_ACCESS_DENIED 예외")
    void deleteBottle_notOwner_throws() {
        User owner = mock(User.class);
        given(owner.getId()).willReturn(99L);

        UserBottle bottle = UserBottle.builder()
            .user(owner).category(SpiritCategory.WHISKY)
            .purchaseDate(LocalDate.now()).price(0).store("test")
            .status(BottleStatus.UNOPENED).isPublic(false).build();
        ReflectionTestUtils.setField(bottle, "id", 1L);
        given(userBottleRepository.findById(1L)).willReturn(Optional.of(bottle));

        assertThatThrownBy(() -> userBottleService.deleteBottle(1L, 1L))
            .isInstanceOf(CustomException.class)
            .extracting("errorCode").isEqualTo(ErrorCode.BOTTLE_ACCESS_DENIED);
    }

    @Test
    @DisplayName("toggleStatus - UNOPENED → OPENED")
    void toggleStatus_success() {
        User user = mock(User.class);
        given(user.getId()).willReturn(1L);

        UserBottle bottle = UserBottle.builder()
            .user(user).category(SpiritCategory.WHISKY)
            .purchaseDate(LocalDate.now()).price(0).store("test")
            .status(BottleStatus.UNOPENED).isPublic(false).build();
        ReflectionTestUtils.setField(bottle, "id", 1L);
        given(userBottleRepository.findById(1L)).willReturn(Optional.of(bottle));

        userBottleService.toggleStatus(1L, 1L);

        assertThat(bottle.getStatus()).isEqualTo(BottleStatus.OPENED);
    }
}
