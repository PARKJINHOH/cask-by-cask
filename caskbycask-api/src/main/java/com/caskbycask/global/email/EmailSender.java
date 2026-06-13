package com.caskbycask.global.email;

import java.util.List;

public interface EmailSender {
    void send(String to, String subject, String body);

    default void sendHtml(String to, String subject, String htmlBody) {
        send(to, subject, htmlBody);
    }

    default void sendHtmlWithAttachments(
            String to, String subject, String htmlBody,
            List<byte[]> contents, List<String> filenames
    ) {
        sendHtml(to, subject, htmlBody);
    }
}
