package com.caskbycask;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class CaskbycaskApiApplicationTests {

    @MockitoBean
    RedisConnectionFactory redisConnectionFactory;

    @MockitoBean
    ReactiveRedisConnectionFactory reactiveRedisConnectionFactory;

    @MockitoBean
    JavaMailSender javaMailSender;

    @Test
    void contextLoads() {
    }
}
