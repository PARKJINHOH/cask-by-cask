package com.caskbycask.domain.translation.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class TranslationMetrics {

    private final MeterRegistry registry;
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    private final AtomicLong allocatedCharacters = new AtomicLong();

    public TranslationMetrics(MeterRegistry registry) {
        this.registry = registry;
        Gauge.builder("translation.monthly.allocated.characters", allocatedCharacters, AtomicLong::get)
                .description("Application-reserved Google Translation characters for the current Pacific month")
                .register(registry);
    }

    public void increment(String outcome) {
        counters.computeIfAbsent(outcome, key -> Counter.builder("translation.requests")
                        .tag("outcome", key)
                        .register(registry))
                .increment();
    }

    public void setAllocatedCharacters(long value) {
        allocatedCharacters.set(value);
    }
}
