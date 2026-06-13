package com.caskbycask.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

// NotificationService @Async 지원 (알림 저장 실패가 본문 트랜잭션을 롤백하지 않도록 분리)
@Configuration
@EnableAsync
public class AsyncConfig {
}
