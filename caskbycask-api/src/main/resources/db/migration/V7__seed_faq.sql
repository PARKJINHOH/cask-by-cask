-- =============================================================================
-- CaskByCask 기초데이터 — 자주 묻는 질문 (FAQ seed)
-- =============================================================================
-- 작성 기준일: 2026-06-01
-- 범위: 서비스 이용 안내(SERVICE) + 위스키(WHISKY) + 꼬냑(COGNAC) + 와인(WINE)
--       각 카테고리별 KO/EN 한 쌍씩 동일 내용으로 구성 (language 컬럼으로 분리)
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 한 번 적용된 후에는 이 파일을 수정하지 마세요.
--     (체크섬 검증 실패로 기동이 막힙니다. 보정이 필요하면 V10__*.sql 로 추가하세요.)
--   - category 는 SERVICE|WHISKY|COGNAC|WINE, language 는 KO|EN 만 허용됩니다.
--   - sort_order 는 카테고리 내 노출 순서입니다. (오름차순)
--   - 운영자가 관리자 페이지에서 추가/수정할 수 있으므로, 본 파일은 "기본 노출용"입니다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 한국어 (KO)
-- -----------------------------------------------------------------------------
INSERT INTO faqs (language, category, question, answer, sort_order, is_active, created_at, updated_at)
VALUES
-- [SERVICE] CaskByCask 이용 안내
('KO', 'SERVICE', 'CaskByCask는 어떤 서비스인가요?',
 'CaskByCask는 위스키·꼬냑·와인을 좋아하는 분들이 직접 마신 술을 기록하고 평점·리뷰를 남기며, 다른 애호가들과 의견을 나누는 리뷰 커뮤니티 플랫폼입니다. 다양한 술 정보를 검색하고 나만의 시음 기록을 쌓아갈 수 있습니다.',
 1, 1, NOW(6), NOW(6)),

('KO', 'SERVICE', '회원가입은 어떻게 하나요?',
 '우측 상단의 로그인 버튼을 눌러 이메일로 간편하게 가입할 수 있습니다. 가입 시 이용약관과 개인정보 처리방침에 동의하시면 모든 기능을 이용하실 수 있습니다.',
 2, 1, NOW(6), NOW(6)),

('KO', 'SERVICE', '리뷰는 어떻게 작성하나요?',
 '원하는 술 상세 페이지에서 평점을 매기고 시음 노트를 남길 수 있습니다. 향·맛·여운 등 느낀 점을 자유롭게 기록해 보세요. 작성한 리뷰는 마이페이지에서 모아볼 수 있습니다.',
 3, 1, NOW(6), NOW(6)),

('KO', 'SERVICE', '평점은 어떤 기준으로 매기나요?',
 '평점은 개인의 취향과 경험을 바탕으로 한 주관적인 평가입니다. 정답은 없으며, 솔직하게 느낀 점을 표현해 주시면 다른 사용자에게도 큰 도움이 됩니다.',
 4, 1, NOW(6), NOW(6)),

('KO', 'SERVICE', '찾는 술이 목록에 없어요.',
 '아직 등록되지 않은 술이 있을 수 있습니다. 운영팀이 지속적으로 데이터베이스를 보강하고 있으니, 문의하기를 통해 알려주시면 검토 후 추가하겠습니다.',
 5, 1, NOW(6), NOW(6)),

('KO', 'SERVICE', '계정 정보는 안전하게 보호되나요?',
 '모든 데이터는 로그인한 사용자 본인 기준으로만 접근 가능하며, 비밀번호는 암호화되어 저장됩니다. 90일마다 비밀번호 변경을 권장하며, 1년간 미접속 시 휴면 계정으로 전환되어 안전하게 보호됩니다.',
 6, 1, NOW(6), NOW(6)),

-- [WHISKY] 위스키
('KO', 'WHISKY', '싱글몰트와 블렌디드 위스키의 차이는 무엇인가요?',
 '싱글몰트는 하나의 증류소에서 맥아(몰트)만으로 만든 위스키이고, 블렌디드는 여러 증류소의 몰트 위스키와 그레인 위스키를 섞어 만든 위스키입니다. 싱글몰트는 증류소 고유의 개성이, 블렌디드는 균형 잡힌 맛이 특징입니다.',
 1, 1, NOW(6), NOW(6)),

('KO', 'WHISKY', '캐스크 스트렝스(Cask Strength)란 무엇인가요?',
 '물을 타지 않고 오크통에서 숙성된 그대로의 도수로 병입한 위스키를 말합니다. 보통 50~60% 이상의 높은 도수를 가지며, 위스키 본연의 진한 풍미를 느낄 수 있습니다. 기호에 따라 물을 약간 첨가해 즐기기도 합니다.',
 2, 1, NOW(6), NOW(6)),

('KO', 'WHISKY', '위스키 숙성 연수(Age Statement)는 무엇을 의미하나요?',
 '병에 표기된 숙성 연수는 블렌딩에 사용된 원액 중 가장 어린 원액의 숙성 기간을 의미합니다. 즉 12년 표기 제품은 최소 12년 이상 숙성된 원액만 사용됩니다. 연수 표기가 없는 NAS(No Age Statement) 제품도 있습니다.',
 3, 1, NOW(6), NOW(6)),

('KO', 'WHISKY', '피트(Peat) 위스키는 어떤 맛인가요?',
 '피트(이탄)를 태워 맥아를 건조시킬 때 배는 스모키하고 약품 같은 독특한 향을 가진 위스키입니다. 스코틀랜드 아일라(Islay) 지역 위스키가 대표적이며, 호불호가 갈리지만 마니아층이 두텁습니다.',
 4, 1, NOW(6), NOW(6)),

-- [COGNAC] 꼬냑
('KO', 'COGNAC', '꼬냑과 브랜디의 차이는 무엇인가요?',
 '브랜디는 과일(주로 포도)을 발효·증류한 술의 총칭이고, 꼬냑은 그중에서도 프랑스 꼬냑 지역에서 엄격한 규정에 따라 만든 포도 브랜디만을 부르는 이름입니다. 모든 꼬냑은 브랜디이지만, 모든 브랜디가 꼬냑은 아닙니다.',
 1, 1, NOW(6), NOW(6)),

('KO', 'COGNAC', 'VS, VSOP, XO 등급은 무엇을 의미하나요?',
 '꼬냑의 숙성 등급입니다. VS(Very Special)는 최소 2년, VSOP(Very Superior Old Pale)는 최소 4년, XO(Extra Old)는 최소 10년 숙성된 원액으로 만듭니다. 숙성이 길수록 부드럽고 복합적인 풍미를 가집니다.',
 2, 1, NOW(6), NOW(6)),

('KO', 'COGNAC', '꼬냑의 크뤼(Cru)란 무엇인가요?',
 '꼬냑 지역은 토양과 기후에 따라 6개의 크뤼(재배 구역)로 나뉩니다. 그랑드 샹파뉴, 쁘띠뜨 샹파뉴, 보르더리, 팡 부아, 봉 부아, 부아 조르디네르 순으로 일반적으로 평가받으며, 두 샹파뉴 크뤼를 50% 이상 블렌딩하면 핀느 샹파뉴(Fine Champagne)로 표기됩니다.',
 3, 1, NOW(6), NOW(6)),

('KO', 'COGNAC', '꼬냑은 어떻게 마시는 것이 좋나요?',
 '튤립 모양의 잔에 따라 향을 충분히 즐기며 상온에서 천천히 마시는 것이 전통적입니다. 식후주(디제스티프)로 즐기거나, 어린 등급은 칵테일 베이스로도 활용됩니다. 정답은 없으니 본인 취향에 맞게 즐기세요.',
 4, 1, NOW(6), NOW(6)),

-- [WINE] 와인
('KO', 'WINE', '와인의 바디(Body)란 무엇인가요?',
 '입안에서 느껴지는 와인의 무게감과 질감을 의미합니다. 가벼운(라이트 바디), 중간(미디엄 바디), 묵직한(풀 바디)으로 나뉩니다. 알코올 도수, 타닌, 당도 등이 바디감에 영향을 줍니다.',
 1, 1, NOW(6), NOW(6)),

('KO', 'WINE', '타닌(Tannin)이 무엇인가요?',
 '포도 껍질·씨·줄기와 오크통에서 나오는 성분으로, 입안을 떫고 마르게 하는 느낌을 줍니다. 주로 레드 와인에서 두드러지며, 와인의 구조감과 숙성 잠재력에 중요한 역할을 합니다.',
 2, 1, NOW(6), NOW(6)),

('KO', 'WINE', '와인은 어떤 온도로 마시는 것이 좋나요?',
 '레드 와인은 15~18도, 화이트 와인은 8~12도, 스파클링 와인은 6~8도가 일반적으로 권장됩니다. 너무 차가우면 향이 닫히고, 너무 따뜻하면 알코올이 강하게 느껴질 수 있습니다.',
 3, 1, NOW(6), NOW(6)),

('KO', 'WINE', '디캔팅(Decanting)은 왜 하나요?',
 '와인을 디캔터에 옮겨 공기와 접촉시키는 과정입니다. 와인을 깨워 향을 열어주고, 오래된 와인의 침전물을 분리하는 목적이 있습니다. 주로 타닌이 강한 영 빈티지 레드 와인에 효과적입니다.',
 4, 1, NOW(6), NOW(6));

-- -----------------------------------------------------------------------------
-- English (EN)
-- -----------------------------------------------------------------------------
INSERT INTO faqs (language, category, question, answer, sort_order, is_active, created_at, updated_at)
VALUES
-- [SERVICE] About CaskByCask
('EN', 'SERVICE', 'What is CaskByCask?',
 'CaskByCask is a review community platform for whisky, cognac, and wine lovers. Members can log the drinks they have tasted, leave ratings and reviews, and share opinions with fellow enthusiasts. You can also search a wide range of drink information and build your own tasting journal.',
 1, 1, NOW(6), NOW(6)),

('EN', 'SERVICE', 'How do I sign up?',
 'Click the Login button at the top right to sign up easily with your email. Once you agree to the Terms of Service and Privacy Policy, you can access all features.',
 2, 1, NOW(6), NOW(6)),

('EN', 'SERVICE', 'How do I write a review?',
 'On any drink detail page you can give a rating and leave tasting notes. Feel free to record what you sensed — aroma, flavor, finish, and more. You can find all your reviews collected on your My Page.',
 3, 1, NOW(6), NOW(6)),

('EN', 'SERVICE', 'How should I decide on a rating?',
 'Ratings are subjective evaluations based on your own taste and experience. There is no right answer — sharing how you honestly felt is what helps other users the most.',
 4, 1, NOW(6), NOW(6)),

('EN', 'SERVICE', 'I can''t find the drink I''m looking for.',
 'Some drinks may not be registered yet. Our team continuously expands the database, so please let us know through the contact form and we will review and add it.',
 5, 1, NOW(6), NOW(6)),

('EN', 'SERVICE', 'Is my account information kept safe?',
 'All data is accessible only to the signed-in owner, and passwords are stored encrypted. We recommend changing your password every 90 days, and accounts inactive for one year are switched to dormant status for added protection.',
 6, 1, NOW(6), NOW(6)),

-- [WHISKY] Whisky
('EN', 'WHISKY', 'What is the difference between single malt and blended whisky?',
 'Single malt is made from malted barley at a single distillery, while blended whisky combines malt whiskies and grain whiskies from multiple distilleries. Single malts highlight a distillery''s unique character, whereas blends are known for their balanced flavor.',
 1, 1, NOW(6), NOW(6)),

('EN', 'WHISKY', 'What does Cask Strength mean?',
 'Cask strength whisky is bottled at the natural alcohol level it reached in the cask, without dilution. It usually has a high ABV of 50–60% or more, delivering the whisky''s full, concentrated flavor. Some enjoy adding a few drops of water to taste.',
 2, 1, NOW(6), NOW(6)),

('EN', 'WHISKY', 'What does the Age Statement on a whisky mean?',
 'The age on the label refers to the youngest whisky used in the blend. So a bottle labeled 12 years contains only spirit aged at least 12 years. Some bottles are NAS (No Age Statement) and carry no age figure.',
 3, 1, NOW(6), NOW(6)),

('EN', 'WHISKY', 'What does a peated whisky taste like?',
 'Peated whisky gets its smoky, medicinal aroma from burning peat to dry the malted barley. Whiskies from Islay in Scotland are the classic example. It divides opinion, but has a devoted following.',
 4, 1, NOW(6), NOW(6)),

-- [COGNAC] Cognac
('EN', 'COGNAC', 'What is the difference between cognac and brandy?',
 'Brandy is a general term for spirits distilled from fermented fruit (mostly grapes). Cognac is a specific grape brandy made in the Cognac region of France under strict regulations. All cognac is brandy, but not all brandy is cognac.',
 1, 1, NOW(6), NOW(6)),

('EN', 'COGNAC', 'What do the VS, VSOP, and XO grades mean?',
 'These are cognac aging grades. VS (Very Special) is aged at least 2 years, VSOP (Very Superior Old Pale) at least 4 years, and XO (Extra Old) at least 10 years. Longer aging generally yields a smoother, more complex flavor.',
 2, 1, NOW(6), NOW(6)),

('EN', 'COGNAC', 'What is a Cru in cognac?',
 'The Cognac region is divided into six crus (growing areas) based on soil and climate. In typical order of prestige they are Grande Champagne, Petite Champagne, Borderies, Fins Bois, Bons Bois, and Bois Ordinaires. A blend of at least 50% from the two Champagne crus may be labeled Fine Champagne.',
 3, 1, NOW(6), NOW(6)),

('EN', 'COGNAC', 'How is cognac best enjoyed?',
 'Traditionally it is sipped slowly at room temperature from a tulip-shaped glass to fully appreciate the aroma. It is often enjoyed as an after-dinner digestif, while younger grades also work well as a cocktail base. There is no single right way — enjoy it to your own taste.',
 4, 1, NOW(6), NOW(6)),

-- [WINE] Wine
('EN', 'WINE', 'What does a wine''s body mean?',
 'Body refers to the weight and texture a wine has in your mouth. It ranges from light-bodied to medium-bodied to full-bodied. Alcohol level, tannin, and sweetness all influence the sense of body.',
 1, 1, NOW(6), NOW(6)),

('EN', 'WINE', 'What is tannin?',
 'Tannin comes from grape skins, seeds, and stems, as well as from oak barrels, giving a drying, astringent sensation in the mouth. It is most prominent in red wines and plays a key role in a wine''s structure and aging potential.',
 2, 1, NOW(6), NOW(6)),

('EN', 'WINE', 'What temperature should wine be served at?',
 'As a general guide, red wine is served at 15–18°C, white wine at 8–12°C, and sparkling wine at 6–8°C. Too cold and the aromas close up; too warm and the alcohol can feel overpowering.',
 3, 1, NOW(6), NOW(6)),

('EN', 'WINE', 'Why do people decant wine?',
 'Decanting means transferring wine into a decanter to expose it to air. It opens up the aromas and separates sediment from older wines. It is especially effective for young, tannic red wines.',
 4, 1, NOW(6), NOW(6));

SELECT 1;
