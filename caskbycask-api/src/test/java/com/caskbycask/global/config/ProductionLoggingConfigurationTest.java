package com.caskbycask.global.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class ProductionLoggingConfigurationTest {

    @Test
    void productionDisablesDatasourceInterceptionAndSqlValueLogging() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application-prod.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("decorator.datasource.enabled")).isEqualTo("false");
        assertThat(properties.getProperty(
                "logging.level.com.caskbycask.global.logging.SqlQueryLoggingListener"))
                .isEqualTo("OFF");
    }
}
