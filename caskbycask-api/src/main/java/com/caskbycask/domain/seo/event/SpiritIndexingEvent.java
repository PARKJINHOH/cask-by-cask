package com.caskbycask.domain.seo.event;

import java.util.List;

public record SpiritIndexingEvent(List<String> urls) {

    public SpiritIndexingEvent {
        urls = List.copyOf(urls);
    }
}
