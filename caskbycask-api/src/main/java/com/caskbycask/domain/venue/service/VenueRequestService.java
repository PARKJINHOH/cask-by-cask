package com.caskbycask.domain.venue.service;

import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.venue.dto.VenueRequestBody;
import com.caskbycask.domain.venue.dto.VenueRequestResponse;
import com.caskbycask.domain.venue.dto.VenueUpsertRequest;
import com.caskbycask.domain.venue.entity.VenueRegisterRequest;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.repository.VenueRegisterRequestRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 장소 제보 → 관리자 승인.
 *
 * <p>승인 시점에 <b>비공개(HIDDEN)</b> 로 만든다. 제보에는 좌표가 없는 경우가 대부분이고
 * (네이버 단축 URL 은 원리상 좌표가 안 나온다), 좌표 없는 장소를 공개하면 목록에는 뜨는데
 * 지도에서는 사라진다. 관리자가 핀을 찍고 나서 직접 공개로 올리는 것이 정상 흐름이다.
 *
 * <p>알림은 {@code REQUEST_APPROVED/REJECTED} 를 재사용한다 — 새 알림 타입을 만들면
 * 프론트의 타입 유니온·아이콘 맵·탭·라우팅 네 파일을 동시에 고쳐야 하는데, 그 비용에 비해
 * 사용자가 얻는 차이가 없다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VenueRequestService {

    private static final String NOTIFICATION_TARGET_TYPE = "VENUE_REQUEST";

    private final VenueRegisterRequestRepository requestRepository;
    private final VenueAdminService venueAdminService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    // ── 사용자 ──────────────────────────────────────────────

    @Transactional
    public VenueRequestResponse submit(VenueRequestBody body, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        VenueRegisterRequest request = requestRepository.save(VenueRegisterRequest.builder()
                .user(user)
                .venueData(serialize(body))
                .build());
        return toResponse(request);
    }

    public List<VenueRequestResponse> getMyRequests(Long userId) {
        return requestRepository.findAllByUserIdOrderByIdDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    // ── 관리자 ──────────────────────────────────────────────

    public Page<VenueRequestResponse> getRequests(RequestStatus status, Pageable pageable) {
        return requestRepository.findForAdmin(status, pageable).map(this::toResponse);
    }

    public VenueRequestResponse getRequest(Long id) {
        return toResponse(findRequest(id));
    }

    /**
     * 승인 — 진짜 장소를 만든다.
     *
     * <p>PENDING 이 아닌 요청은 거절한다. 이 가드가 없으면 같은 요청을 두 번 승인해
     * 같은 가게가 두 개 생긴다.
     */
    @Transactional
    public VenueRequestResponse approve(Long id, Long adminId, Long venueCityId) {
        VenueRegisterRequest request = findRequest(id);
        if (!request.isPending()) {
            throw new CustomException(ErrorCode.VENUE_REQUEST_NOT_EDITABLE);
        }
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        VenueRequestBody body = parse(request.getVenueData());

        var created = venueAdminService.create(new VenueUpsertRequest(
                venueCityId,
                body.venueType(),
                // 좌표는 관리자가 확인한 뒤에 공개한다 — 아래 주석 참고.
                VenueStatus.HIDDEN,
                body.nameKo(), body.nameEn(), body.nameLocal(),
                body.address(), body.addressDetail(),
                body.lat(), body.lng(),
                body.phone(), body.website(), body.instagramUrl(), body.openingHours(),
                body.googleMapsUrl(), body.naverMapsUrl(), body.kakaoMapsUrl(),
                null, null,
                body.descriptionKo(), null));

        request.approve(admin, created.venue().summary().id());
        notificationService.send(request.getUser(), NotificationType.REQUEST_APPROVED,
                "장소 등록 요청 '" + body.nameKo() + "'이(가) 승인되었습니다.",
                NOTIFICATION_TARGET_TYPE, request.getId());
        return toResponse(request);
    }

    @Transactional
    public VenueRequestResponse reject(Long id, Long adminId, String reason) {
        VenueRegisterRequest request = findRequest(id);
        if (!request.isPending()) {
            throw new CustomException(ErrorCode.VENUE_REQUEST_NOT_EDITABLE);
        }
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        request.reject(admin, reason);
        notificationService.send(request.getUser(), NotificationType.REQUEST_REJECTED,
                "장소 등록 요청이 반려되었습니다.", NOTIFICATION_TARGET_TYPE, request.getId());
        return toResponse(request);
    }

    // ── 내부 ────────────────────────────────────────────────

    private VenueRegisterRequest findRequest(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_REQUEST_NOT_FOUND));
    }

    private VenueRequestResponse toResponse(VenueRegisterRequest request) {
        return VenueRequestResponse.from(request, parse(request.getVenueData()));
    }

    private String serialize(VenueRequestBody body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private VenueRequestBody parse(String json) {
        try {
            return objectMapper.readValue(json, VenueRequestBody.class);
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
