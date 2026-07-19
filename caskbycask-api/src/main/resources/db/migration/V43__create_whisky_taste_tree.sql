CREATE TABLE taste_trees (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tree_type VARCHAR(20) NOT NULL,
    owner_user_id BIGINT NULL,
    share_key VARCHAR(64) NOT NULL,
    source_tree_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_taste_trees_share_key UNIQUE (share_key),
    CONSTRAINT fk_taste_trees_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_taste_trees_source FOREIGN KEY (source_tree_id) REFERENCES taste_trees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_taste_trees_owner_updated ON taste_trees (owner_user_id, updated_at);
CREATE INDEX idx_taste_trees_type ON taste_trees (tree_type);

CREATE TABLE taste_tree_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tree_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(1000) NULL,
    content_json LONGTEXT NOT NULL,
    published_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_taste_tree_versions_number UNIQUE (tree_id, version_number),
    CONSTRAINT fk_taste_tree_versions_tree FOREIGN KEY (tree_id) REFERENCES taste_trees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_taste_tree_versions_tree_status ON taste_tree_versions (tree_id, status, version_number);

CREATE TABLE taste_tree_bookmarks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tree_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_taste_tree_bookmarks_tree_user UNIQUE (tree_id, user_id),
    CONSTRAINT fk_taste_tree_bookmarks_tree FOREIGN KEY (tree_id) REFERENCES taste_trees (id) ON DELETE CASCADE,
    CONSTRAINT fk_taste_tree_bookmarks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_taste_tree_bookmarks_user ON taste_tree_bookmarks (user_id, created_at);

CREATE TABLE taste_tree_results (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tree_id BIGINT NOT NULL,
    tree_version_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    share_key VARCHAR(64) NOT NULL,
    path_json LONGTEXT NOT NULL,
    items_json LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_taste_tree_results_share_key UNIQUE (share_key),
    CONSTRAINT fk_taste_tree_results_tree FOREIGN KEY (tree_id) REFERENCES taste_trees (id) ON DELETE CASCADE,
    CONSTRAINT fk_taste_tree_results_version FOREIGN KEY (tree_version_id) REFERENCES taste_tree_versions (id) ON DELETE CASCADE,
    CONSTRAINT fk_taste_tree_results_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_taste_tree_results_user ON taste_tree_results (user_id, created_at);
CREATE INDEX idx_taste_tree_results_tree_version ON taste_tree_results (tree_id, tree_version_id);

CREATE TABLE taste_tree_images (
    id BIGINT NOT NULL AUTO_INCREMENT,
    uploaded_by_id BIGINT NOT NULL,
    original_file_name VARCHAR(255) NULL,
    saved_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sub_path VARCHAR(200) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_taste_tree_images_saved_file UNIQUE (saved_file_name),
    CONSTRAINT fk_taste_tree_images_uploader FOREIGN KEY (uploaded_by_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_taste_tree_images_uploader ON taste_tree_images (uploaded_by_id);

INSERT INTO taste_trees (tree_type, owner_user_id, share_key, source_tree_id, created_at, updated_at) VALUES
('OFFICIAL', NULL, 'official-first-whisky', NULL, NOW(6), NOW(6)),
('OFFICIAL', NULL, 'official-tried-whisky', NULL, NOW(6), NOW(6)),
('OFFICIAL', NULL, 'official-know-my-taste', NULL, NOW(6), NOW(6)),
('OFFICIAL', NULL, 'official-deep-explore', NULL, NOW(6), NOW(6));

INSERT INTO taste_tree_versions
(tree_id, version_number, status, title, description, content_json, published_at, created_at, updated_at)
SELECT id, 1, 'PUBLISHED', '위스키가 처음이라면', '익숙한 맛과 향을 고르면 부담 없이 첫 위스키 스타일을 찾을 수 있어요.',
'{"experienceLevel":"BEGINNER","nodes":[{"key":"start","type":"START","titleKo":"내 취향은 위스키 트리 어디쯤일까?","titleEn":"Where does my taste sit on the whisky tree?","descriptionKo":"어려운 용어 없이 좋아하는 맛부터 시작해요.","descriptionEn":"Start with familiar flavors, no whisky knowledge needed.","positionX":420,"positionY":20,"options":[{"key":"begin","labelKo":"시작하기","labelEn":"Start","targetNodeKey":"flavor"}]},{"key":"flavor","type":"QUESTION","titleKo":"평소 어떤 향과 맛이 가장 끌리나요?","titleEn":"Which flavors appeal to you most?","descriptionKo":"가장 먼저 떠오르는 하나를 골라주세요.","descriptionEn":"Choose the one that feels most natural.","positionX":420,"positionY":170,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"sweet","labelKo":"달콤하고 고소한 맛","labelEn":"Sweet and nutty","descriptionKo":"꿀, 바닐라, 캐러멜","descriptionEn":"Honey, vanilla and caramel","targetNodeKey":"sweet-detail","attributeCodes":["SWEET","VANILLA"]},{"key":"fruit","labelKo":"풍성한 과일 맛","labelEn":"Rich fruit","descriptionKo":"사과, 복숭아, 건과일","descriptionEn":"Apple, peach and dried fruit","targetNodeKey":"fruit-detail","attributeCodes":["FRUITY"]},{"key":"smoke","labelKo":"불향과 스모키함","labelEn":"Smoke and bonfire","descriptionKo":"모닥불, 숯, 바다 향","descriptionEn":"Bonfire, ash and sea air","targetNodeKey":"smoke-detail","attributeCodes":["PEAT","SMOKE"]}]},{"key":"sweet-detail","type":"QUESTION","titleKo":"어떤 단맛이 더 좋나요?","titleEn":"Which kind of sweetness do you prefer?","positionX":70,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"vanilla","labelKo":"꿀과 바닐라","labelEn":"Honey and vanilla","targetNodeKey":"bourbon-cask"},{"key":"caramel","labelKo":"진한 캐러멜","labelEn":"Deep caramel","targetNodeKey":"bourbon"},{"key":"dried","labelKo":"건과일과 초콜릿","labelEn":"Dried fruit and chocolate","targetNodeKey":"sherry"}]},{"key":"fruit-detail","type":"QUESTION","titleKo":"과일의 느낌은 어느 쪽인가요?","titleEn":"What kind of fruit character?","positionX":420,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"fresh","labelKo":"산뜻한 사과와 배","labelEn":"Fresh apple and pear","targetNodeKey":"light-fruity"},{"key":"rich","labelKo":"진한 포도와 붉은 과일","labelEn":"Rich grape and red fruit","targetNodeKey":"wine-cask"}]},{"key":"smoke-detail","type":"QUESTION","titleKo":"연기 향은 어느 정도가 좋나요?","titleEn":"How much smoke sounds good?","positionX":770,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"gentle","labelKo":"은은하게","labelEn":"Gentle smoke","targetNodeKey":"peated"},{"key":"strong","labelKo":"강렬하게","labelEn":"Bold smoke","targetNodeKey":"peated"}]},{"key":"bourbon-cask","type":"RESULT","titleKo":"부드러운 버번 캐스크 몰트","titleEn":"Soft bourbon-cask malt","positionX":10,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT"],"peated":false,"caskToken":"EX_BOURBON","resultTitleKo":"버번 캐스크 몰트","resultTitleEn":"Bourbon-cask malt","recommendationReasonKo":"꿀과 바닐라처럼 부드러운 단맛을 고른 취향과 잘 맞아요.","recommendationReasonEn":"A good match for your preference for honeyed vanilla sweetness."}},{"key":"bourbon","type":"RESULT","titleKo":"달콤하고 힘 있는 버번 위스키","titleEn":"Sweet and bold bourbon","positionX":190,"positionY":540,"dynamicFilter":{"styles":["BOURBON","WHEATED_BOURBON","TENNESSEE"],"peated":false,"resultTitleKo":"버번 위스키","resultTitleEn":"Bourbon whiskey","recommendationReasonKo":"진한 캐러멜과 오크의 달콤함을 원하는 취향에 어울려요.","recommendationReasonEn":"Suited to your taste for deep caramel and sweet oak."}},{"key":"sherry","type":"RESULT","titleKo":"풍성한 셰리 캐스크 몰트","titleEn":"Rich sherry-cask malt","positionX":370,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT"],"peated":false,"caskToken":"EX_SHERRY","resultTitleKo":"셰리 캐스크 몰트","resultTitleEn":"Sherry-cask malt","recommendationReasonKo":"건과일과 초콜릿의 진하고 풍성한 맛을 고른 취향과 잘 맞아요.","recommendationReasonEn":"Matches your preference for rich dried fruit and chocolate."}},{"key":"light-fruity","type":"RESULT","titleKo":"가볍고 산뜻한 프루티 몰트","titleEn":"Light and fruity malt","positionX":550,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"peated":false,"resultTitleKo":"라이트 & 프루티 몰트","resultTitleEn":"Light and fruity malt","recommendationReasonKo":"사과와 배처럼 맑고 산뜻한 과일 향을 고른 취향과 잘 맞아요.","recommendationReasonEn":"A fit for your preference for fresh apple and pear notes."}},{"key":"wine-cask","type":"RESULT","titleKo":"붉은 과일이 풍성한 와인 캐스크 몰트","titleEn":"Red-fruit wine-cask malt","positionX":730,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT"],"peated":false,"caskToken":"EX_WINE","resultTitleKo":"와인 캐스크 몰트","resultTitleEn":"Wine-cask malt","recommendationReasonKo":"진한 포도와 붉은 과일의 풍성함을 원하는 취향에 어울려요.","recommendationReasonEn":"Suited to your preference for rich grape and red-fruit notes."}},{"key":"peated","type":"RESULT","titleKo":"연기와 바다 향의 피티드 몰트","titleEn":"Smoky maritime peated malt","positionX":910,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"peated":true,"resultTitleKo":"피티드 위스키","resultTitleEn":"Peated whisky","recommendationReasonKo":"모닥불과 숯처럼 분명한 스모키함을 고른 취향과 잘 맞아요.","recommendationReasonEn":"Matches your interest in bonfire smoke and ashy character."}}]}' , NOW(6), NOW(6), NOW(6)
FROM taste_trees WHERE share_key = 'official-first-whisky';

INSERT INTO taste_tree_versions
(tree_id, version_number, status, title, description, content_json, published_at, created_at, updated_at)
SELECT id, 1, 'PUBLISHED', '마셔본 적이 있다면', '좋았던 스타일과 풍미를 바탕으로 다음 한 병을 찾아보세요.',
'{"experienceLevel":"NOVICE","nodes":[{"key":"start","type":"START","titleKo":"기억에 남은 스타일에서 시작해요","titleEn":"Start with a style you remember","descriptionKo":"세부 취향을 고르면 최대 3병을 추천해 드려요.","descriptionEn":"Refine your taste and get up to three recommendations.","positionX":420,"positionY":20,"options":[{"key":"begin","labelKo":"시작하기","labelEn":"Start","targetNodeKey":"style"}]},{"key":"style","type":"QUESTION","titleKo":"어떤 스타일을 더 마셔보고 싶나요?","titleEn":"Which style would you like to explore?","positionX":420,"positionY":170,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"bourbon","labelKo":"버번 위스키","labelEn":"Bourbon whiskey","targetNodeKey":"bourbon-detail"},{"key":"sherry","labelKo":"셰리 캐스크 몰트","labelEn":"Sherry-cask malt","targetNodeKey":"sherry-detail"},{"key":"peat","labelKo":"피티드 위스키","labelEn":"Peated whisky","targetNodeKey":"peat-detail"},{"key":"unsure","labelKo":"아직 잘 모르겠어요","labelEn":"I am not sure yet","targetNodeKey":"unsure-detail"}]},{"key":"bourbon-detail","type":"QUESTION","titleKo":"버번에서 어떤 매력이 좋았나요?","titleEn":"What did you like about bourbon?","positionX":20,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"soft","labelKo":"부드러운 바닐라와 캐러멜","labelEn":"Soft vanilla and caramel","targetNodeKey":"bourbon-soft"},{"key":"spicy","labelKo":"톡 쏘는 향신료와 오크","labelEn":"Spice and oak","targetNodeKey":"rye"}]},{"key":"sherry-detail","type":"QUESTION","titleKo":"셰리의 어떤 풍미가 좋았나요?","titleEn":"Which sherry notes did you enjoy?","positionX":300,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"fruit","labelKo":"건포도와 무화과","labelEn":"Raisin and fig","targetNodeKey":"sherry-rich"},{"key":"dark","labelKo":"초콜릿과 커피","labelEn":"Chocolate and coffee","targetNodeKey":"sherry-rich"}]},{"key":"peat-detail","type":"QUESTION","titleKo":"원하는 피트 강도는?","titleEn":"How intense should the peat be?","positionX":580,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"balanced","labelKo":"균형 있게","labelEn":"Balanced","targetNodeKey":"peat"},{"key":"intense","labelKo":"강렬하게","labelEn":"Intense","targetNodeKey":"peat"}]},{"key":"unsure-detail","type":"QUESTION","titleKo":"둘 중 더 끌리는 표현을 골라주세요","titleEn":"Which description sounds better?","positionX":860,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"easy","labelKo":"편안하고 달콤하게","labelEn":"Easy and sweet","targetNodeKey":"bourbon-cask"},{"key":"bold","labelKo":"개성 있고 강렬하게","labelEn":"Distinct and bold","targetNodeKey":"peat"}]},{"key":"bourbon-soft","type":"RESULT","titleKo":"부드러운 버번","titleEn":"Soft bourbon","positionX":20,"positionY":540,"dynamicFilter":{"styles":["BOURBON","WHEATED_BOURBON","TENNESSEE"],"peated":false,"recommendationReasonKo":"바닐라와 캐러멜이 부드럽게 이어지는 버번을 선호한 취향과 잘 맞아요.","recommendationReasonEn":"Matches your preference for soft vanilla and caramel."}},{"key":"rye","type":"RESULT","titleKo":"스파이시한 라이 위스키","titleEn":"Spicy rye whisky","positionX":220,"positionY":540,"dynamicFilter":{"styles":["RYE"],"peated":false,"recommendationReasonKo":"향신료와 오크의 또렷한 자극을 원하는 취향에 어울려요.","recommendationReasonEn":"A good fit for your taste for spice and assertive oak."}},{"key":"sherry-rich","type":"RESULT","titleKo":"진하고 묵직한 셰리 몰트","titleEn":"Rich full-bodied sherry malt","positionX":420,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT"],"peated":false,"caskToken":"EX_SHERRY","recommendationReasonKo":"건과일과 다크 초콜릿처럼 농밀한 셰리 풍미를 고른 취향과 잘 맞아요.","recommendationReasonEn":"Matches your preference for dense dried fruit and dark chocolate."}},{"key":"peat","type":"RESULT","titleKo":"스모키한 피티드 몰트","titleEn":"Smoky peated malt","positionX":620,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"peated":true,"recommendationReasonKo":"연기와 숯의 개성 있는 풍미를 더 탐험하고 싶은 취향에 어울려요.","recommendationReasonEn":"Suited to your interest in smoky, ashy character."}},{"key":"bourbon-cask","type":"RESULT","titleKo":"편안한 버번 캐스크 몰트","titleEn":"Approachable bourbon-cask malt","positionX":820,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"peated":false,"caskToken":"EX_BOURBON","recommendationReasonKo":"부드럽고 달콤하게 즐기고 싶은 취향에 잘 맞아요.","recommendationReasonEn":"A fit for an easy, sweet and approachable dram."}}]}' , NOW(6), NOW(6), NOW(6)
FROM taste_trees WHERE share_key = 'official-tried-whisky';

INSERT INTO taste_tree_versions
(tree_id, version_number, status, title, description, content_json, published_at, created_at, updated_at)
SELECT id, 1, 'PUBLISHED', '취향을 알고 있다면', '캐스크·피트·독립병입 조건으로 더 정교하게 탐색하세요.',
'{"experienceLevel":"INTERMEDIATE","nodes":[{"key":"start","type":"START","titleKo":"알고 있는 취향을 더 깊게 좁혀볼까요?","titleEn":"Refine the taste you already know","descriptionKo":"전문적인 조건을 직관적인 선택으로 정리했어요.","descriptionEn":"Explore technical preferences through simple choices.","positionX":420,"positionY":20,"options":[{"key":"begin","labelKo":"시작하기","labelEn":"Start","targetNodeKey":"focus"}]},{"key":"focus","type":"QUESTION","titleKo":"오늘 무엇을 기준으로 찾을까요?","titleEn":"What should guide the search today?","positionX":420,"positionY":170,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"cask","labelKo":"캐스크","labelEn":"Cask","targetNodeKey":"cask-detail"},{"key":"peat","labelKo":"피트","labelEn":"Peat","targetNodeKey":"peat-detail"},{"key":"ib","labelKo":"독립병입","labelEn":"Independent bottling","targetNodeKey":"ib-detail"}]},{"key":"cask-detail","type":"QUESTION","titleKo":"선호하는 캐스크는?","titleEn":"Which cask do you prefer?","positionX":100,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"oloroso","labelKo":"올로로소 셰리","labelEn":"Oloroso sherry","targetNodeKey":"oloroso"},{"key":"px","labelKo":"PX 셰리","labelEn":"PX sherry","targetNodeKey":"px"},{"key":"bourbon","labelKo":"퍼스트필 버번","labelEn":"First-fill bourbon","targetNodeKey":"bourbon-cask"}]},{"key":"peat-detail","type":"QUESTION","titleKo":"어떤 피트 표현을 원하나요?","titleEn":"Which peat expression do you want?","positionX":470,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"maritime","labelKo":"바다와 약품","labelEn":"Maritime and medicinal","targetNodeKey":"peat"},{"key":"bonfire","labelKo":"모닥불과 재","labelEn":"Bonfire and ash","targetNodeKey":"peat"}]},{"key":"ib-detail","type":"QUESTION","titleKo":"독립병입에서 중요한 조건은?","titleEn":"What matters in an independent bottling?","positionX":820,"positionY":340,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"cs","labelKo":"캐스크 스트렝스","labelEn":"Cask strength","targetNodeKey":"ib-cs"},{"key":"single","labelKo":"싱글 캐스크","labelEn":"Single cask","targetNodeKey":"ib-single"}]},{"key":"oloroso","type":"RESULT","titleKo":"올로로소 셰리 캐스크","titleEn":"Oloroso sherry cask","positionX":20,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT"],"caskToken":"EX_OLOROSO","recommendationReasonKo":"올로로소 특유의 견과류와 건과일 풍미를 찾는 취향과 잘 맞아요.","recommendationReasonEn":"Matches your preference for nutty Oloroso dried-fruit character."}},{"key":"px","type":"RESULT","titleKo":"PX 셰리 캐스크","titleEn":"PX sherry cask","positionX":200,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT"],"caskToken":"EX_PX","recommendationReasonKo":"PX의 농밀한 단맛과 검은 과일 풍미를 원하는 취향에 어울려요.","recommendationReasonEn":"Suited to your taste for dense PX sweetness and dark fruit."}},{"key":"bourbon-cask","type":"RESULT","titleKo":"퍼스트필 버번 캐스크","titleEn":"First-fill bourbon cask","positionX":380,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT"],"peated":false,"caskToken":"EX_BOURBON","recommendationReasonKo":"증류소 캐릭터와 바닐라 중심의 깨끗한 캐스크 영향을 선호한 취향과 잘 맞아요.","recommendationReasonEn":"A fit for clean vanilla oak that preserves distillery character."}},{"key":"peat","type":"RESULT","titleKo":"개성 강한 피티드 몰트","titleEn":"Characterful peated malt","positionX":560,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"peated":true,"recommendationReasonKo":"바다, 약품, 모닥불처럼 선명한 피트 표현을 탐험하는 취향에 어울려요.","recommendationReasonEn":"Matches your interest in vivid maritime, medicinal and bonfire peat."}},{"key":"ib-cs","type":"RESULT","titleKo":"독립병입 캐스크 스트렝스","titleEn":"Independent cask strength","positionX":740,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"bottlingType":"IB","caskStrength":true,"recommendationReasonKo":"희석하지 않은 강도와 독립병입자의 해석을 원하는 취향에 잘 맞아요.","recommendationReasonEn":"A fit for full-strength spirit and an independent bottler perspective."}},{"key":"ib-single","type":"RESULT","titleKo":"독립병입 싱글 캐스크","titleEn":"Independent single cask","positionX":920,"positionY":540,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"bottlingType":"IB","singleCask":true,"recommendationReasonKo":"한 캐스크의 개성과 희소성을 깊게 즐기려는 취향에 어울려요.","recommendationReasonEn":"Suited to exploring the unique character of a single cask."}}]}' , NOW(6), NOW(6), NOW(6)
FROM taste_trees WHERE share_key = 'official-know-my-taste';

INSERT INTO taste_tree_versions
(tree_id, version_number, status, title, description, content_json, published_at, created_at, updated_at)
SELECT id, 1, 'PUBLISHED', '깊게 탐험하기', '추천을 넘어 새로운 조합과 병입 방식을 발견하는 탐험 트리입니다.',
'{"experienceLevel":"EXPERT","nodes":[{"key":"start","type":"START","titleKo":"오늘은 어떤 방향으로 탐험할까요?","titleEn":"Where should the exploration go today?","descriptionKo":"익숙한 취향에서 한 걸음 더 나아가 보세요.","descriptionEn":"Move one step beyond your familiar preferences.","positionX":420,"positionY":20,"options":[{"key":"begin","labelKo":"탐험 시작","labelEn":"Explore","targetNodeKey":"discovery"}]},{"key":"discovery","type":"QUESTION","titleKo":"가장 궁금한 주제를 골라주세요","titleEn":"Choose the theme that interests you most","positionX":420,"positionY":180,"selectionType":"SINGLE","minSelect":1,"maxSelect":1,"options":[{"key":"combo","labelKo":"캐스크 조합","labelEn":"Cask combinations","targetNodeKey":"wine"},{"key":"raw","labelKo":"원액의 힘","labelEn":"Spirit at full strength","targetNodeKey":"cask-strength"},{"key":"ib","labelKo":"독립병입자의 시선","labelEn":"Independent bottlers","targetNodeKey":"independent"},{"key":"peat","labelKo":"피트의 다양한 얼굴","labelEn":"Faces of peat","targetNodeKey":"peated"}]},{"key":"wine","type":"RESULT","titleKo":"와인 캐스크 피니시 탐험","titleEn":"Wine-cask finish exploration","positionX":80,"positionY":420,"dynamicFilter":{"styles":["SINGLE_MALT"],"caskToken":"EX_WINE","recommendationReasonKo":"기본 원액과 와인 캐스크가 만드는 새로운 과일·탄닌 조합을 탐험하기 좋아요.","recommendationReasonEn":"Explore how wine casks reshape fruit, tannin and spirit character."}},{"key":"cask-strength","type":"RESULT","titleKo":"캐스크 스트렝스 비교","titleEn":"Cask-strength comparison","positionX":330,"positionY":420,"dynamicFilter":{"styles":["SINGLE_MALT","BOURBON","RYE"],"caskStrength":true,"recommendationReasonKo":"물 조절에 따라 열리는 향과 질감의 변화를 직접 비교하기 좋아요.","recommendationReasonEn":"Ideal for comparing how aroma and texture unfold with water."}},{"key":"independent","type":"RESULT","titleKo":"독립병입 탐험","titleEn":"Independent bottling exploration","positionX":580,"positionY":420,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"bottlingType":"IB","recommendationReasonKo":"공식병입과 다른 캐스크 선택과 병입 철학을 발견하기 좋아요.","recommendationReasonEn":"Discover cask choices and bottling philosophies beyond official releases."}},{"key":"peated","type":"RESULT","titleKo":"피트 스타일 비교","titleEn":"Peat-style comparison","positionX":830,"positionY":420,"dynamicFilter":{"styles":["SINGLE_MALT","BLENDED_MALT"],"peated":true,"recommendationReasonKo":"약품, 재, 바다, 훈제처럼 서로 다른 피트 결을 비교하기 좋아요.","recommendationReasonEn":"Compare medicinal, ashy, maritime and smoky expressions of peat."}}]}' , NOW(6), NOW(6), NOW(6)
FROM taste_trees WHERE share_key = 'official-deep-explore';
