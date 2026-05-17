package com.drinkindex.global.email;

public interface EmailSender {
    void send(String to, String subject, String body);
}
