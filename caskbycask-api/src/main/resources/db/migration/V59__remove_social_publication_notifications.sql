DELETE FROM notifications
WHERE type = 'SOCIAL_PUBLICATION';

ALTER TABLE notifications
    MODIFY COLUMN type ENUM(
        'BYOB_APPLY',
        'BYOB_APPROVE',
        'BYOB_REJECT',
        'BYOB_REMOVE',
        'COMMENT',
        'LIKE',
        'MENTION',
        'MESSAGE',
        'PRICE_ALERT',
        'REPLY',
        'REQUEST_APPROVED',
        'REQUEST_REJECTED',
        'SYSTEM'
    ) NOT NULL
    COMMENT '알림 유형 — COMMENT/REPLY/LIKE/MENTION/MESSAGE/BYOB_*/PRICE_ALERT/REQUEST_*/SYSTEM';
