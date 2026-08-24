package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.pricetracker.entity.PriceAlert;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceAlertRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class PriceAlertServiceNotifyTest {

    @Mock PriceAlertRepository priceAlertRepository;
    @Mock SpiritRepository spiritRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @InjectMocks PriceAlertService service;

    private static final Spirit SPIRIT = Spirit.builder().id(236L).nameKo("카발란 솔리스트 마데이라").build();

    @Test
    @DisplayName("면세 알림은 환산 원화가 목표가 이하일 때 발동한다")
    void notifiesDutyFreeAlertOnConvertedKrw() {
        PriceAlert alert = alert(1L, 1000, StoreType.DUTYFREE, "270000");
        givenAlerts(1000, StoreType.DUTYFREE, List.of(alert));

        service.checkAndNotifyAlerts(236L, 1000, StoreType.DUTYFREE, new BigDecimal("267176"), 99L);

        ArgumentCaptor<String> message = ArgumentCaptor.forClass(String.class);
        then(notificationService).should().sendNow(
                any(User.class), org.mockito.ArgumentMatchers.eq(NotificationType.PRICE_ALERT),
                message.capture(), org.mockito.ArgumentMatchers.eq("SPIRIT_PRICE"),
                org.mockito.ArgumentMatchers.eq(236L));
        // 구간과 금액이 문구에 드러나야 어떤 알림인지 알 수 있다.
        assertThat(message.getValue()).contains("면세").contains("1000ml").contains("267,176");
        assertThat(alert.getLastNotifiedPriceKrw()).isEqualByComparingTo("267176");
    }

    @Test
    @DisplayName("다른 구간의 알림은 조회되지 않는다 — 국내 목표가가 면세 가격에 반응하면 안 된다")
    void queriesOnlyMatchingStoreType() {
        givenAlerts(1000, StoreType.DUTYFREE, List.of());

        service.checkAndNotifyAlerts(236L, 1000, StoreType.DUTYFREE, new BigDecimal("100000"), 99L);

        then(priceAlertRepository).should()
                .findBySpiritIdAndVolumeMlAndStoreTypeAndIsActiveTrue(236L, 1000, StoreType.DUTYFREE);
        then(notificationService).should(never()).sendNow(any(), any(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("직전과 같은 가격이면 쿨다운이 끝나도 다시 알리지 않는다")
    void suppressesRepeatNotificationAtSamePrice() {
        PriceAlert alert = alert(1L, 1000, StoreType.DUTYFREE, "270000");
        ReflectionTestUtils.setField(alert, "lastNotifiedAt", LocalDateTime.now().minusDays(3));
        ReflectionTestUtils.setField(alert, "lastNotifiedPriceKrw", new BigDecimal("267176"));
        givenAlerts(1000, StoreType.DUTYFREE, List.of(alert));

        service.checkAndNotifyAlerts(236L, 1000, StoreType.DUTYFREE, new BigDecimal("267176"), 99L);

        then(notificationService).should(never()).sendNow(any(), any(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("더 싸지면 다시 알린다")
    void notifiesAgainWhenPriceDrops() {
        PriceAlert alert = alert(1L, 1000, StoreType.DUTYFREE, "270000");
        ReflectionTestUtils.setField(alert, "lastNotifiedAt", LocalDateTime.now().minusDays(3));
        ReflectionTestUtils.setField(alert, "lastNotifiedPriceKrw", new BigDecimal("267176"));
        givenAlerts(1000, StoreType.DUTYFREE, List.of(alert));

        service.checkAndNotifyAlerts(236L, 1000, StoreType.DUTYFREE, new BigDecimal("250000"), 99L);

        then(notificationService).should().sendNow(any(), any(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("24시간 내 재발동은 막는다")
    void respectsCooldown() {
        PriceAlert alert = alert(1L, 1000, StoreType.DUTYFREE, "270000");
        ReflectionTestUtils.setField(alert, "lastNotifiedAt", LocalDateTime.now().minusHours(2));
        givenAlerts(1000, StoreType.DUTYFREE, List.of(alert));

        service.checkAndNotifyAlerts(236L, 1000, StoreType.DUTYFREE, new BigDecimal("100000"), 99L);

        then(notificationService).should(never()).sendNow(any(), any(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("알림 저장이 실패하면 발동 시각을 남기지 않는다 — 다음 승인 때 재시도된다")
    void doesNotMarkNotifiedWhenSendFails() {
        PriceAlert alert = alert(1L, 1000, StoreType.DUTYFREE, "270000");
        givenAlerts(1000, StoreType.DUTYFREE, List.of(alert));
        willThrow(new IllegalStateException("db down"))
                .given(notificationService).sendNow(any(), any(), anyString(), anyString(), anyLong());

        service.checkAndNotifyAlerts(236L, 1000, StoreType.DUTYFREE, new BigDecimal("267176"), 99L);

        assertThat(alert.getLastNotifiedAt()).isNull();
        assertThat(alert.getLastNotifiedPriceKrw()).isNull();
        then(priceAlertRepository).should(never()).save(any(PriceAlert.class));
    }

    @Test
    @DisplayName("환산 원화가 없는 레거시 제보는 알림 대상이 아니다")
    void skipsWhenKrwIsUnavailable() {
        service.checkAndNotifyAlerts(236L, 1000, StoreType.DUTYFREE, null, 99L);

        then(priceAlertRepository).shouldHaveNoInteractions();
        then(notificationService).shouldHaveNoInteractions();
    }

    private void givenAlerts(Integer volumeMl, StoreType storeType, List<PriceAlert> alerts) {
        given(priceAlertRepository.findBySpiritIdAndVolumeMlAndStoreTypeAndIsActiveTrue(236L, volumeMl, storeType))
                .willReturn(alerts);
        given(priceAlertRepository.findBySpiritIdAndVolumeMlIsNullAndStoreTypeAndIsActiveTrue(236L, storeType))
                .willReturn(List.of());
    }

    private PriceAlert alert(Long id, Integer volumeMl, StoreType storeType, String targetKrw) {
        PriceAlert alert = PriceAlert.builder()
                .user(User.builder().id(11L).nickname("사용자").build())
                .spirit(SPIRIT)
                .volumeMl(volumeMl)
                .storeType(storeType)
                .targetPriceKrw(new BigDecimal(targetKrw))
                .build();
        ReflectionTestUtils.setField(alert, "id", id);
        return alert;
    }
}
