package com.caskbycask.domain.youtube.dto;

import com.caskbycask.domain.youtube.service.YoutubeSyncService.SyncResult;

import java.util.List;

/** '지금 수집' 결과. 실패도 200 으로 내려 화면이 채널별 사유를 그대로 보여 준다. */
public record YoutubeSyncResultResponse(
        int channelCount,
        int createdCount,
        int updatedCount,
        List<Item> items
) {
    public record Item(Long channelId, String channelTitle, int created, int updated, String error) {
    }

    public static YoutubeSyncResultResponse from(List<SyncResult> results) {
        return new YoutubeSyncResultResponse(
                results.size(),
                results.stream().mapToInt(SyncResult::created).sum(),
                results.stream().mapToInt(SyncResult::updated).sum(),
                results.stream()
                        .map(result -> new Item(result.channelId(), result.channelTitle(),
                                result.created(), result.updated(), result.error()))
                        .toList()
        );
    }
}
