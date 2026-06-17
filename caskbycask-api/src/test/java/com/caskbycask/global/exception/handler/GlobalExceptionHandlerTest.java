package com.caskbycask.global.exception.handler;

import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    void noResourceFoundReturnsNotFound() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ResponseEntity<ApiResponse<Void>> response = handler.handleNotFound(
                new NoResourceFoundException(HttpMethod.GET, "/api/auth/admin-credentials")
        );

        assertThat(response.getStatusCode()).isEqualTo(ErrorCode.NOT_FOUND.getHttpStatus());
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
    }
}
