package com.caskbycask.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        return singleThreadScheduler("scheduling-");
    }

    @Bean
    public ThreadPoolTaskScheduler exchangeRateTaskScheduler() {
        return singleThreadScheduler("exchange-rate-scheduling-");
    }

    /**
     * 유튜브 갤러리 수집 전용.
     * <p>공용 {@link #taskScheduler()} 는 단일 스레드라, 채널마다 외부 HTTP 를 기다리는 수집이
     * 올라타면 그 뒤의 정리 배치들이 함께 밀린다.
     */
    @Bean
    public ThreadPoolTaskScheduler youtubeSyncTaskScheduler() {
        return singleThreadScheduler("youtube-sync-scheduling-");
    }

    private ThreadPoolTaskScheduler singleThreadScheduler(String threadNamePrefix) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix(threadNamePrefix);
        return scheduler;
    }
}
