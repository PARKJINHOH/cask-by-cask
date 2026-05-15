package com.drinkindex.global.util;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 팝업 이미지 업로드 Rate Limiter — 분당 20회 슬라이딩 윈도우.
 * 키: userId (관리자 전용 엔드포인트이므로 IP 대신 userId 사용).
 */
@Component
public class PopupImageRateLimiter {

    private static final int MAX_REQUESTS = 20;
    private static final long WINDOW_MS = 60_000L;

    private final ConcurrentHashMap<Long, List<Long>> requestLog = new ConcurrentHashMap<>();

    public boolean isAllowed(Long userId) {
        long now = System.currentTimeMillis();
        requestLog.compute(userId, (k, times) -> {
            if (times == null) times = new ArrayList<>();
            times.removeIf(t -> now - t > WINDOW_MS);
            times.add(now);
            return times;
        });
        return requestLog.get(userId).size() <= MAX_REQUESTS;
    }
}
