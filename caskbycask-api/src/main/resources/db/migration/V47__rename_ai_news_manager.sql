UPDATE users
SET nickname = '소식관리자',
    updated_at = NOW(6)
WHERE email = 'ai-news@system.caskbycask.local'
  AND nickname <> '소식관리자';
