package com.caskbycask.domain.venue.service;

import com.caskbycask.domain.venue.client.MapShareLinkExpander;
import com.caskbycask.domain.venue.client.NominatimGeocoder;
import com.caskbycask.domain.venue.dto.VenueLinkResolveRequest;
import com.caskbycask.domain.venue.dto.VenueLinkResolveResponse;
import com.caskbycask.domain.venue.dto.VenueLinkResolveResponse.Source;
import com.caskbycask.domain.venue.support.MapShareUrlParser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 공유 링크 → 좌표 해석. 관리자 화면의 "붙여넣기 → 해석" 버튼 하나가 이 순서를 탄다.
 *
 * <h3>폴백 체인</h3>
 * <ol>
 *   <li><b>순수 파싱</b> — 네트워크 없음. 항상 켜져 있다</li>
 *   <li><b>단축 URL 확장</b> — {@code venue.link-resolver.enabled}, 운영 기본 false</li>
 *   <li><b>주소 지오코딩</b> — {@code venue.geocoder.enabled}, 기본 false</li>
 *   <li><b>수동 핀 드롭</b> — 화면에서. <b>항상 살아 있는 정상 경로다</b></li>
 * </ol>
 *
 * <p>1~3 이 전부 실패해도 이 메서드는 예외를 던지지 않는다. 관리자 폼은 좌표 없이도
 * 저장할 수 있어야 하고(비공개 상태로), 나중에 지도에서 핀을 찍으면 된다.
 * 리졸버를 통째로 꺼도 장소 등록이 막히지 않는 것이 이 설계의 핵심이다.
 */
@Service
@RequiredArgsConstructor
public class VenueLinkResolveService {

    private final MapShareLinkExpander linkExpander;
    private final NominatimGeocoder geocoder;

    public VenueLinkResolveResponse resolve(VenueLinkResolveRequest request) {
        String link = request.link() == null ? "" : request.link().trim();
        String hint = request.addressHint() == null ? "" : request.addressHint().trim();

        if (link.isEmpty() && hint.isEmpty()) {
            return VenueLinkResolveResponse.none("링크나 주소를 입력해주세요.");
        }

        // 1) 순수 파싱 — 네트워크를 쓰지 않으므로 언제나 시도한다.
        MapShareUrlParser.ParsedLink parsed = MapShareUrlParser.parse(link);
        if (parsed.hasCoordinates()) {
            return build(parsed.coordinates(), link, parsed, Source.PARSED,
                    "링크에서 좌표를 찾았습니다.");
        }

        // 2) 단축 링크 확장 후 다시 파싱.
        if (parsed.shortLink() != null) {
            if (!linkExpander.isEnabled()) {
                return VenueLinkResolveResponse.none(
                        "단축 링크는 좌표를 담고 있지 않습니다. 지도에서 위치를 직접 지정해주세요.");
            }
            var expanded = linkExpander.expand(parsed.shortLink());
            if (expanded.isPresent()) {
                MapShareUrlParser.ParsedLink second = MapShareUrlParser.parse(expanded.get());
                if (second.hasCoordinates()) {
                    return build(second.coordinates(), expanded.get(), second, Source.EXPANDED,
                            "단축 링크를 펼쳐 좌표를 찾았습니다.");
                }
                // 좌표는 못 얻었어도 place id 는 건질 수 있다.
                parsed = second;
            }
        }

        // 3) 주소 지오코딩.
        String geocodeQuery = !hint.isEmpty() ? hint : null;
        if (geocodeQuery != null && geocoder.isEnabled()) {
            var found = geocoder.geocode(geocodeQuery);
            if (found.isPresent()) {
                return build(found.get(), null, parsed, Source.GEOCODED,
                        "주소로 검색한 결과입니다. 위치가 맞는지 지도에서 확인해주세요.");
            }
        }

        // 4) 수동 핀 드롭으로 넘긴다.
        return new VenueLinkResolveResponse(
                null, null, null,
                parsed.googlePlaceId(), parsed.naverPlaceId(),
                Source.NONE,
                "좌표를 찾지 못했습니다. 지도에서 위치를 직접 지정해주세요.");
    }

    private VenueLinkResolveResponse build(MapShareUrlParser.Coordinates coordinates,
                                           String resolvedUrl,
                                           MapShareUrlParser.ParsedLink parsed,
                                           Source source,
                                           String message) {
        return new VenueLinkResolveResponse(
                coordinates.lat(), coordinates.lng(), resolvedUrl,
                parsed.googlePlaceId(), parsed.naverPlaceId(), source, message);
    }
}
