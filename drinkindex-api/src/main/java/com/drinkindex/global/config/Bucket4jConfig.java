package com.drinkindex.global.config;

import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.AbstractRedisClient;
import io.lettuce.core.RedisClient;
import io.lettuce.core.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

import java.time.Duration;

@Configuration
public class Bucket4jConfig {

    @Bean
    public ProxyManager<String> bucket4jProxyManager(LettuceConnectionFactory connectionFactory) {
        AbstractRedisClient nativeClient = connectionFactory.getNativeClient();
        if (!(nativeClient instanceof RedisClient redisClient)) {
            throw new IllegalStateException("클러스터 Redis는 Rate Limiting에 지원되지 않습니다.");
        }
        StatefulRedisConnection<String, byte[]> connection =
                redisClient.connect(RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));

        return LettuceBasedProxyManager.<String>builderFor(connection)
                // 버킷 미사용 시 2분 후 Redis에서 자동 제거
                .withExpirationAfterWriteStrategy(
                        ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(Duration.ofMinutes(2))
                )
                .build();
    }
}
