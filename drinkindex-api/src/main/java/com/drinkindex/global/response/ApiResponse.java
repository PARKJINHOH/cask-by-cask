package com.drinkindex.global.response;

import lombok.Getter;

@Getter
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final String code;
    private final String message;

    private ApiResponse(boolean success, T data, String code, String message) {
        this.success = success;
        this.data = data;
        this.code = code;
        this.message = message;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(true, null, null, null);
    }

    public static <T> ApiResponse<T> fail(String code, String message) {
        return new ApiResponse<>(false, null, code, message);
    }
}
