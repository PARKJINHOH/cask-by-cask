package com.caskbycask.domain.social.batch;

import com.caskbycask.domain.social.service.SocialAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SocialTokenRefreshScheduler {

    private final SocialAccountService accountService;

    @Scheduled(cron = "0 20 3 * * *", zone = "Asia/Seoul")
    public void refreshExpiringTokens() {
        accountService.refreshExpiringTokens();
    }
}
