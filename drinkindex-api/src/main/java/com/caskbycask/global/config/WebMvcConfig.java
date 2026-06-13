package com.caskbycask.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${upload.path}")
    private String uploadPath;

    // local 프로파일에서만 값이 주입됨. dev/prod에서는 빈 문자열로 폴백.
    @Value("${storage.local.base-path:}")
    private String storageLocalBasePath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String locationUri = Path.of(uploadPath).toAbsolutePath().toUri().toString();
        if (!locationUri.endsWith("/")) {
            locationUri += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(locationUri);

        // [local 전용] 공지사항 이미지 정적 서빙.
        // dev/prod에서는 S3 URL로 직접 접근하므로 이 핸들러 불필요.
        if (!storageLocalBasePath.isEmpty()) {
            String noticeDir = Path.of(storageLocalBasePath).resolve("notices")
                    .toAbsolutePath().toUri().toString();
            if (!noticeDir.endsWith("/")) {
                noticeDir += "/";
            }
            registry.addResourceHandler("/api/notices/images/**")
                    .addResourceLocations(noticeDir);
        }
    }
}
