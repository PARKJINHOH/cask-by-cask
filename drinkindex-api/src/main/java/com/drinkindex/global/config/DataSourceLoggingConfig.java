package com.drinkindex.global.config;

import com.drinkindex.global.logging.SqlQueryLoggingListener;
import net.ttddyy.dsproxy.listener.QueryExecutionListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "decorator.datasource.enabled", havingValue = "true")
public class DataSourceLoggingConfig {

    @Bean
    public QueryExecutionListener sqlQueryLoggingListener() {
        return new SqlQueryLoggingListener();
    }
}
