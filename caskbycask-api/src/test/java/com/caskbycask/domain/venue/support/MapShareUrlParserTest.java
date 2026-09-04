package com.caskbycask.domain.venue.support;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 지도 공유 링크 파서.
 *
 * <p>버그가 사는 곳이 정확히 여기다 — 벤더마다 좌표를 넣는 자리가 다르고, 같은 벤더 안에서도
 * "화면 중심"과 "실제 핀"이 따로 있다. 전부 오프라인으로 검증한다(네트워크를 쓰지 않는 설계다).
 *
 * <p>실패 케이스가 성공 케이스만큼 중요하다. 네이버 단축 링크처럼 <b>원리상 좌표가 없는</b>
 * 입력을 "실패"로 정확히 분류해야, 화면이 수동 핀 드롭으로 안내할 수 있다.
 */
class MapShareUrlParserTest {

    @Nested
    @DisplayName("좌표를 뽑을 수 있는 입력")
    class Extractable {

        @Test
        @DisplayName("구글 롱폼 — 화면 중심(@)이 아니라 실제 핀(!3d!4d)을 쓴다")
        void googleLongFormPrefersPin() {
            var parsed = MapShareUrlParser.parse(
                    "https://www.google.com/maps/place/Bar/@35.6800000,139.7600000,17z"
                            + "/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d35.6812362!4d139.7671248");

            assertThat(parsed.hasCoordinates()).isTrue();
            // @ 값(35.68)이 아니라 !3d 값(35.6812362)이 나와야 한다.
            assertThat(parsed.coordinates().lat()).isEqualByComparingTo("35.6812362");
            assertThat(parsed.coordinates().lng()).isEqualByComparingTo("139.7671248");
        }

        @Test
        @DisplayName("구글 롱폼 — 핀이 없으면 화면 중심으로 떨어진다")
        void googleFallsBackToCenter() {
            var parsed = MapShareUrlParser.parse(
                    "https://www.google.com/maps/place/Bar/@35.6812362,139.7671248,17z/");

            assertThat(parsed.coordinates().lat()).isEqualByComparingTo("35.6812362");
        }

        @Test
        @DisplayName("네이버 c 파라미터 — 경도가 먼저다")
        void naverCenterIsLngFirst() {
            var parsed = MapShareUrlParser.parse(
                    "https://map.naver.com/p/search/bar?c=127.0276188,37.4979502,15,0,0,0,dh");

            // 순서를 뒤집으면 한국 좌표가 소말리아 근처로 간다 — 조용히 틀리는 종류의 버그다.
            assertThat(parsed.coordinates().lat()).isEqualByComparingTo("37.4979502");
            assertThat(parsed.coordinates().lng()).isEqualByComparingTo("127.0276188");
        }

        @ParameterizedTest(name = "[{index}] {0}")
        @CsvSource({
                "'https://maps.apple.com/?ll=37.4979502,127.0276188',            37.4979502, 127.0276188",
                "'https://www.google.com/maps/search/?api=1&query=35.6812,139.7671', 35.6812, 139.7671",
                "'geo:37.5665,126.9780',                                          37.5665,    126.9780",
                "'37.5665, 126.9780',                                             37.5665,    126.9780",
                "'  35.0116,135.7681  ',                                          35.0116,    135.7681",
                "'https://map.kakao.com/link/map/카카오판교오피스,37.402056,127.108212', 37.402056, 127.108212",
                "'https://map.kakao.com/link/to/한남바,37.5385,127.0006',           37.5385,    127.0006",
                "'https://map.kakao.com/link/roadview/37.5665,126.9780',           37.5665,    126.9780",
        })
        @DisplayName("애플·구글 검색·geo URI·카카오 링크·맨 좌표도 읽는다")
        void otherForms(String input, String lat, String lng) {
            var parsed = MapShareUrlParser.parse(input);

            assertThat(parsed.hasCoordinates()).isTrue();
            assertThat(parsed.coordinates().lat()).isEqualByComparingTo(new BigDecimal(lat));
            assertThat(parsed.coordinates().lng()).isEqualByComparingTo(new BigDecimal(lng));
        }

        @Test
        @DisplayName("남반구·서반구 음수 좌표를 읽는다")
        void negativeCoordinates() {
            var parsed = MapShareUrlParser.parse("geo:-33.8688,151.2093");

            assertThat(parsed.coordinates().lat()).isEqualByComparingTo("-33.8688");
        }

        @Test
        @DisplayName("카카오 링크 — 상호에 쉼표가 들어가도 뒤의 좌표 두 개만 읽는다")
        void kakaoNameWithComma() {
            var parsed = MapShareUrlParser.parse(
                    "https://map.kakao.com/link/map/바 크래프트, 강남점,37.4979502,127.0276188");

            assertThat(parsed.coordinates().lat()).isEqualByComparingTo("37.4979502");
            assertThat(parsed.coordinates().lng()).isEqualByComparingTo("127.0276188");
        }
    }

    @Nested
    @DisplayName("좌표를 뽑을 수 없는 입력 — 수동 핀으로 안내해야 한다")
    class NotExtractable {

        @ParameterizedTest(name = "[{index}] {0}")
        @ValueSource(strings = {
                "https://maps.app.goo.gl/AbCdEfGhIjK",          // 단축 — 확장 전에는 좌표가 없다
                "https://naver.me/xAbCd12",                     // 단축 — 확장해도 보통 place id 뿐이다
                "https://map.naver.com/p/entry/place/1234567890", // place id 만
                "https://example.com/some/page",                // 지도 링크가 아니다
                // 카카오 웹 공유 — urlX/urlY 는 WCONGNAMUL 이라 위경도가 아니다.
                // 이걸 좌표로 읽으면 핀이 엉뚱한 곳에 꽂힌다. 좌표 없음이 정답이다.
                "https://map.kakao.com/?itemId=1234567&urlX=505000&urlY=1119000&urlLevel=3",
                "https://place.map.kakao.com/12345678",         // place id 만
                "https://kko.kakao.com/AbCdEfGh",               // 단축 — 확장 전에는 좌표가 없다
                "그냥 텍스트",
                "",
        })
        @DisplayName("좌표가 없는 입력은 좌표 없음으로 분류한다")
        void noCoordinates(String input) {
            assertThat(MapShareUrlParser.parse(input).hasCoordinates()).isFalse();
        }

        @Test
        @DisplayName("null 을 넣어도 터지지 않는다")
        void nullIsSafe() {
            assertThatCode(() -> MapShareUrlParser.parse(null)).doesNotThrowAnyException();
            assertThat(MapShareUrlParser.parse(null).hasCoordinates()).isFalse();
        }

        @Test
        @DisplayName("0,0 은 좌표가 아니라 파싱 실패의 잔재로 본다")
        void zeroZeroIsRejected() {
            // 기니만 앞바다에 바가 없어서가 아니다 — 실패했을 때 흔히 남는 값이 0 이라
            // 유효한 좌표로 받으면 아프리카 앞바다에 마커가 찍힌다.
            assertThat(MapShareUrlParser.parse("geo:0,0").hasCoordinates()).isFalse();
        }

        @Test
        @DisplayName("범위 밖 좌표는 무시한다")
        void outOfRangeIsRejected() {
            assertThat(MapShareUrlParser.parse("geo:91.5,127.0").hasCoordinates()).isFalse();
            assertThat(MapShareUrlParser.parse("geo:37.5,181.5").hasCoordinates()).isFalse();
        }
    }

    @Nested
    @DisplayName("식별자 추출과 SSRF 경계")
    class Identifiers {

        @Test
        @DisplayName("네이버 place id 를 뽑는다")
        void naverPlaceId() {
            var parsed = MapShareUrlParser.parse("https://map.naver.com/p/entry/place/1234567890?c=1");

            assertThat(parsed.naverPlaceId()).isEqualTo("1234567890");
        }

        @Test
        @DisplayName("구글 place id 를 뽑는다")
        void googlePlaceId() {
            var parsed = MapShareUrlParser.parse(
                    "https://www.google.com/maps/search/?api=1&query=bar&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4");

            assertThat(parsed.googlePlaceId()).isEqualTo("ChIJN1t_tDeuEmsRUsoyG83frY4");
        }

        @Test
        @DisplayName("단축 링크는 코드만 뽑고 URL 은 상수 호스트에서 다시 조립한다")
        void shortLinkRebuildsFromConstantHost() {
            var parsed = MapShareUrlParser.parse("https://maps.app.goo.gl/AbCdEfGhIjK");

            assertThat(parsed.shortLink()).isNotNull();
            assertThat(parsed.shortLink().code()).isEqualTo("AbCdEfGhIjK");
            // 사용자가 준 문자열이 그대로 요청 대상이 되지 않는다는 것이 핵심이다.
            assertThat(parsed.shortLink().toAbsoluteUrl())
                    .isEqualTo("https://maps.app.goo.gl/AbCdEfGhIjK");
        }

        @Test
        @DisplayName("카카오 단축 링크도 상수 호스트에서 다시 조립한다")
        void kakaoShortLink() {
            var parsed = MapShareUrlParser.parse("https://kko.kakao.com/AbCdEfGh");

            assertThat(parsed.shortLink()).isNotNull();
            assertThat(parsed.shortLink().provider())
                    .isEqualTo(MapShareUrlParser.Provider.KAKAO);
            assertThat(parsed.shortLink().toAbsoluteUrl())
                    .isEqualTo("https://kko.kakao.com/AbCdEfGh");
        }

        @Test
        @DisplayName("허용 목록 밖 호스트는 단축 링크로 인정하지 않는다")
        void unknownHostIsNotAShortLink() {
            // 이게 뚫리면 임의 호스트로 서버 요청을 보내게 만들 수 있다.
            assertThat(MapShareUrlParser.parse("https://evil.example.com/AbCdEf").shortLink()).isNull();
            assertThat(MapShareUrlParser.parse("https://naver.me.evil.com/AbCdEf").shortLink()).isNull();
        }

        @ParameterizedTest(name = "[{index}] 경로 {0} 는 코드로 인정하지 않는다")
        @ValueSource(strings = {
                "https://naver.me/../../etc/passwd",
                "https://naver.me/ab",                    // 너무 짧다
                "https://naver.me/AbCd/EfGh",             // 세그먼트가 둘
                "https://naver.me/AbCd?x=1#y",            // 쿼리·해시가 붙은 경로
        })
        @DisplayName("코드 형식을 벗어나면 요청을 만들지 않는다")
        void malformedCodesRejected(String input) {
            var shortLink = MapShareUrlParser.parse(input).shortLink();
            if (shortLink != null) {
                // 통과하더라도 코드에는 경로 구분자가 절대 섞이면 안 된다.
                assertThat(shortLink.code()).doesNotContain("/", "..", "?", "#");
            }
        }
    }
}
