package com.caskbycask.domain.tierlist.service;

import com.caskbycask.domain.tierlist.dto.TierListGuestDraftRequest;
import com.caskbycask.domain.tierlist.dto.TierListRowRequest;
import com.caskbycask.domain.tierlist.entity.TierListGuestDraft;
import com.caskbycask.domain.tierlist.repository.*;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TierListGuestDraftServiceTest {

    @Mock private TierListGuestDraftRepository draftRepository;
    @Mock private TierListGuestDraftImageRepository draftImageRepository;
    @Mock private TierListImageRepository tierListImageRepository;
    @Mock private UserRepository userRepository;
    @Mock private ValidatedImageUploader validatedImageUploader;
    @Mock private FileStorageService fileStorageService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    @InjectMocks private TierListGuestDraftService service;

    @Captor private ArgumentCaptor<TierListGuestDraft> draftCaptor;

    @Test
    void createStoresOnlyHashedTokenAndExpiresInThirtyMinutes() {
        given(draftRepository.existsByTokenHash(anyString())).willReturn(false);
        given(draftRepository.save(any(TierListGuestDraft.class))).willAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime before = LocalDateTime.now();
        var response = service.create(request());

        verify(draftRepository).save(draftCaptor.capture());
        TierListGuestDraft saved = draftCaptor.getValue();
        assertThat(response.token()).isNotBlank();
        assertThat(saved.getTokenHash()).hasSize(64).isNotEqualTo(response.token());
        assertThat(saved.getExpiresAt()).isBetween(before.plusMinutes(29), before.plusMinutes(31));
        assertThat(response.content().rows()).hasSize(1);
    }

    @Test
    void expiredDraftIsRejectedAndDeleted() throws Exception {
        TierListGuestDraft expired = TierListGuestDraft.builder()
                .id(7L)
                .tokenHash("hash")
                .contentJson(objectMapper.writeValueAsString(request()))
                .expiresAt(LocalDateTime.now().minusSeconds(1))
                .build();
        given(draftRepository.findByTokenHash(anyString())).willReturn(Optional.of(expired));
        given(draftImageRepository.findAllByDraftId(7L)).willReturn(List.of());

        assertThatThrownBy(() -> service.get("raw-token"))
                .isInstanceOfSatisfying(CustomException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TIER_LIST_DRAFT_EXPIRED));
        verify(draftRepository).delete(expired);
    }

    private TierListGuestDraftRequest request() {
        return new TierListGuestDraftRequest(
                "",
                null,
                List.of(new TierListRowRequest("S", "S", "#f87171", 0)),
                List.of());
    }
}
