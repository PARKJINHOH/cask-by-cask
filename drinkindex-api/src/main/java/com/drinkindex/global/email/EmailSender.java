package com.drinkindex.global.email;

public interface EmailSender {
    void send(String to, String subject, String body);

    default void sendHtml(String to, String subject, String htmlBody) {
        send(to, subject, htmlBody);
    }
}
