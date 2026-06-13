package com.caskbycask.domain.community.controller;

import com.caskbycask.domain.community.dto.MessageDetailResponse;
import com.caskbycask.domain.community.dto.MessageSummaryResponse;
import com.caskbycask.domain.community.dto.ReplyMessageRequest;
import com.caskbycask.domain.community.dto.SendMessageRequest;
import com.caskbycask.domain.community.service.MessageService;
import com.caskbycask.domain.community.service.MessageService.MessageBox;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class MessageController {

    private final MessageService messageService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MessageSummaryResponse>>> getMessages(
            @RequestParam(defaultValue = "INBOX") MessageBox box,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(messageService.getMessages(userDetails.getUserId(), box, page, size))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MessageDetailResponse>> getThread(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.getThread(id, userDetails.getUserId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MessageDetailResponse>> send(
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.sendMessage(request, userDetails.getUserId())));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<ApiResponse<MessageDetailResponse>> reply(
            @PathVariable Long id,
            @Valid @RequestBody ReplyMessageRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.reply(id, request, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        messageService.deleteMessage(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
