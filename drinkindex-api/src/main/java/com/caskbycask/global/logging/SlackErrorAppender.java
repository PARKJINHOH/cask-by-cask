package com.caskbycask.global.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.UnsynchronizedAppenderBase;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Slack Incoming Webhook 으로 ERROR 로그를 전송하는 Logback custom appender.
 *
 * 특징:
 *  - 비동기 (백그라운드 워커 스레드, 큐 1024)
 *  - Rate limit: 분당 N건 (기본 5) — ERROR 폭주 시 Slack 도배 방지
 *  - webhookUrl 이 비어있으면 조용히 no-op (개발 환경 등)
 *
 * logback-spring.xml 설정 예:
 *   <appender name="SLACK" class="com.caskbycask.global.logging.SlackErrorAppender">
 *     <webhookUrl>${SLACK_WEBHOOK_URL}</webhookUrl>
 *     <channel>${SLACK_CHANNEL}</channel>
 *     <env>prod</env>
 *     <maxPerMinute>5</maxPerMinute>
 *   </appender>
 */
public class SlackErrorAppender extends UnsynchronizedAppenderBase<ILoggingEvent> {

    private String webhookUrl;
    private String channel = "#caskbycask-alerts";
    private String env = "prod";
    private int maxPerMinute = 5;

    private HttpClient httpClient;
    private BlockingQueue<ILoggingEvent> queue;
    private Thread worker;
    private volatile boolean running = false;

    // Rate limit (분 단위 슬라이딩)
    private final AtomicLong windowStart = new AtomicLong(0);
    private final AtomicInteger windowCount = new AtomicInteger(0);
    private final AtomicInteger throttledCount = new AtomicInteger(0);

    @Override
    public void start() {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            addInfo("SlackErrorAppender disabled — webhookUrl is empty.");
            return;
        }
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.queue = new ArrayBlockingQueue<>(1024);
        this.running = true;
        this.worker = new Thread(this::run, "slack-error-appender");
        this.worker.setDaemon(true);
        this.worker.start();
        super.start();
        addInfo("SlackErrorAppender started — channel=" + channel + ", env=" + env);
    }

    @Override
    public void stop() {
        running = false;
        if (worker != null) {
            worker.interrupt();
            try { worker.join(2000); } catch (InterruptedException ignored) {}
        }
        super.stop();
    }

    @Override
    protected void append(ILoggingEvent event) {
        if (!running || queue == null) return;
        // 큐가 가득 차면 drop (서비스 영향 최소화)
        queue.offer(event);
    }

    private void run() {
        while (running) {
            try {
                ILoggingEvent event = queue.poll(1, TimeUnit.SECONDS);
                if (event == null) continue;
                if (isRateLimited()) {
                    throttledCount.incrementAndGet();
                    continue;
                }
                int throttled = throttledCount.getAndSet(0);
                send(event, throttled);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                addWarn("Slack send failed: " + e.getMessage());
            }
        }
    }

    private boolean isRateLimited() {
        long now = System.currentTimeMillis();
        long start = windowStart.get();
        if (now - start >= 60_000L) {
            windowStart.set(now);
            windowCount.set(1);
            return false;
        }
        return windowCount.incrementAndGet() > maxPerMinute;
    }

    private void send(ILoggingEvent event, int throttledCount) throws Exception {
        String payload = buildPayload(event, throttledCount);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(webhookUrl))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() / 100 != 2) {
            addWarn("Slack webhook non-2xx: " + resp.statusCode() + " " + resp.body());
        }
    }

    private String buildPayload(ILoggingEvent event, int throttled) {
        String level = event.getLevel().toString();
        String logger = event.getLoggerName();
        String thread = event.getThreadName();
        String message = escapeJson(event.getFormattedMessage());

        String stack = "";
        IThrowableProxy tp = event.getThrowableProxy();
        if (tp != null) {
            String full = ThrowableProxyUtil.asString(tp);
            if (full.length() > 2500) full = full.substring(0, 2500) + "\n... (truncated)";
            stack = escapeJson(full);
        }

        String throttleNote = throttled > 0
                ? "\\n_(이전 1분 동안 " + throttled + "건 추가 ERROR 가 묶여 생략됨)_"
                : "";

        return "{"
                + "\"channel\":\"" + escapeJson(channel) + "\","
                + "\"username\":\"CaskByCask Logger\","
                + "\"icon_emoji\":\":rotating_light:\","
                + "\"attachments\":[{"
                + "  \"color\":\"danger\","
                + "  \"title\":\"" + level + " — " + escapeJson(env) + "\","
                + "  \"text\":\"*" + escapeJson(logger) + "* [" + escapeJson(thread) + "]\\n" + message + throttleNote + "\","
                + "  \"fields\":[" + (stack.isEmpty() ? "" :
                    "{\"title\":\"Stack\",\"value\":\"```" + stack + "```\",\"short\":false}")
                + "],"
                + "  \"ts\":" + (event.getTimeStamp() / 1000)
                + "}]"
                + "}";
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }

    // ─── Logback property setters ───
    public void setWebhookUrl(String webhookUrl)   { this.webhookUrl = webhookUrl; }
    public void setChannel(String channel)         { this.channel = channel; }
    public void setEnv(String env)                 { this.env = env; }
    public void setMaxPerMinute(int maxPerMinute)  { this.maxPerMinute = maxPerMinute; }
}
