package com.caskbycask.domain.pricetracker.repository;

import com.caskbycask.domain.pricetracker.entity.ExchangeRate;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, PriceCurrency> {
    List<ExchangeRate> findByCurrencyIn(Collection<PriceCurrency> currencies);
}
