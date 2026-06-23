package com.caskbycask.domain.byob.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor
public class UpdateByobRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;

    @NotBlank
    @Size(max = 100)
    private String location;

    @NotBlank
    @Size(max = 200)
    private String address;

    @NotNull
    private LocalDateTime eventAt;

    @NotNull
    private LocalDateTime recruitStartAt;

    @NotNull
    private LocalDateTime recruitEndAt;

    @Min(2)
    private int maxParticipants;

    private List<String> hostBottles = new ArrayList<>();
}
