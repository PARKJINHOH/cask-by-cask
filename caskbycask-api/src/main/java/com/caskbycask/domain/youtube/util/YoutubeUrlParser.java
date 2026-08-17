package com.caskbycask.domain.youtube.util;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 관리자가 붙여 넣은 유튜브 주소에서 식별자만 뽑아낸다.
 * <p>
 * [보안] 뽑아낸 조각은 <b>항상 우리가 조립한 youtube.com 주소</b>에만 쓴다. 붙여 넣은 문자열을
 * 그대로 요청 URL 로 쓰면 관리자 입력이 곧 서버의 외부 요청 대상이 되어 SSRF 통로가 된다.
 * 그래서 이 클래스는 URL 을 돌려주지 않고 식별자(핸들·채널ID·영상ID)만 돌려준다.
 */
public final class YoutubeUrlParser {

    /** 채널 ID 는 'UC' + 22자다. */
    private static final Pattern CHANNEL_ID = Pattern.compile("(UC[A-Za-z0-9_-]{22})");
    private static final Pattern HANDLE = Pattern.compile("@([A-Za-z0-9._-]{3,30})");
    /** 영상 ID 는 11자 고정이다. */
    private static final Pattern VIDEO_ID_IN_PATH =
            Pattern.compile("(?:youtu\\.be/|/shorts/|/embed/|/live/|/v/)([A-Za-z0-9_-]{11})");
    private static final Pattern VIDEO_ID_IN_QUERY = Pattern.compile("[?&]v=([A-Za-z0-9_-]{11})");
    private static final Pattern BARE_VIDEO_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");

    private YoutubeUrlParser() {
    }

    /** 채널 주소·핸들·채널ID 중 무엇을 붙여 넣었는지 가려낸다. */
    public record ChannelReference(String channelKey, String handle) {
        public boolean hasChannelKey() {
            return channelKey != null;
        }
    }

    /**
     * 채널 참조를 해석한다. 해석 불가면 null.
     * <p>
     * 받아들이는 형태: {@code https://www.youtube.com/@handle}, {@code @handle}, {@code handle},
     * {@code https://www.youtube.com/channel/UC...}, {@code UC...}
     * <p>
     * {@code /c/이름}·{@code /user/이름} 형태의 옛 주소는 채널 ID 를 담고 있지 않아 받지 않는다 —
     * 관리자에게 채널 홈에서 핸들(@…)을 복사해 오도록 안내하는 편이 확실하다.
     */
    public static ChannelReference parseChannelReference(String raw) {
        if (raw == null) return null;
        String input = raw.trim();
        if (input.isEmpty()) return null;

        Matcher channelId = CHANNEL_ID.matcher(input);
        if (channelId.find()) {
            return new ChannelReference(channelId.group(1), null);
        }

        Matcher handle = HANDLE.matcher(input);
        if (handle.find()) {
            return new ChannelReference(null, handle.group(1));
        }

        // '@' 없이 핸들만 적은 경우. 주소 조각(슬래시·공백)이 섞였으면 핸들로 보지 않는다.
        if (input.matches("[A-Za-z0-9._-]{3,30}")) {
            return new ChannelReference(null, input);
        }
        return null;
    }

    /**
     * 영상 주소에서 영상 ID 를 뽑는다. 해석 불가면 null.
     * <p>
     * 받아들이는 형태: {@code watch?v=…}, {@code youtu.be/…}, {@code /shorts/…}, {@code /embed/…},
     * {@code /live/…}, 그리고 11자 영상 ID 자체.
     */
    public static String parseVideoKey(String raw) {
        if (raw == null) return null;
        String input = raw.trim();
        if (input.isEmpty()) return null;

        if (BARE_VIDEO_ID.matcher(input).matches()) return input;

        Matcher inPath = VIDEO_ID_IN_PATH.matcher(input);
        if (inPath.find()) return inPath.group(1);

        Matcher inQuery = VIDEO_ID_IN_QUERY.matcher(input);
        if (inQuery.find()) return inQuery.group(1);

        return null;
    }

    /** 붙여 넣은 주소가 숏츠 주소였는지 — 관리자 직접 등록의 유형 기본값에 쓴다. */
    public static boolean looksLikeShorts(String raw) {
        return raw != null && raw.toLowerCase(Locale.ROOT).contains("/shorts/");
    }

    /** 채널 홈 주소. 핸들이 있으면 사람이 읽는 주소를, 없으면 채널 ID 주소를 쓴다. */
    public static String channelHomeUrl(String channelKey, String handle) {
        return handle != null && !handle.isBlank()
                ? "https://www.youtube.com/@" + handle
                : "https://www.youtube.com/channel/" + channelKey;
    }

    /** 영상 원문 주소 — '유튜브에서 보기' 버튼과 JSON-LD 가 함께 쓴다. */
    public static String watchUrl(String videoKey) {
        return "https://www.youtube.com/watch?v=" + videoKey;
    }

    /**
     * 임베드 주소.
     * <p>
     * {@code youtube-nocookie.com} 을 쓴다 — 사용자가 재생을 시작하기 전까지 광고 식별 쿠키를
     * 심지 않아, 동의 없는 제3자 쿠키 문제를 피할 수 있다(개인정보 처리방침과도 어긋나지 않는다).
     */
    public static String embedUrl(String videoKey) {
        return "https://www.youtube-nocookie.com/embed/" + videoKey;
    }
}
