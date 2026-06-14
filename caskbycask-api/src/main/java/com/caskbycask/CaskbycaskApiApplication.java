package com.caskbycask;

import com.caskbycask.global.config.OAuthProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(OAuthProperties.class)
public class CaskbycaskApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CaskbycaskApiApplication.class, args);
    }
}
