package com.caskbycask.global.auth.oauth;

import com.caskbycask.domain.user.entity.enums.SocialProvider;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/** provider → 클라이언트 매핑. 서비스가 SocialProvider 로 적절한 클라이언트를 얻는다. */
@Component
public class OAuthClientRegistry {

    private final Map<SocialProvider, OAuthProviderClient> clients = new EnumMap<>(SocialProvider.class);

    public OAuthClientRegistry(List<OAuthProviderClient> providerClients) {
        for (OAuthProviderClient client : providerClients) {
            clients.put(client.provider(), client);
        }
    }

    public OAuthProviderClient get(SocialProvider provider) {
        OAuthProviderClient client = clients.get(provider);
        if (client == null) {
            throw new IllegalArgumentException("Unsupported social provider: " + provider);
        }
        return client;
    }
}
