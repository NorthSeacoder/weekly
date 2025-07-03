-- 内容类型表（支持扩展新的内容类型）
CREATE TABLE content_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '内容类型名称',
    slug VARCHAR(50) NOT NULL UNIQUE COMMENT '内容类型路径标识',
    description TEXT COMMENT '内容类型描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT '内容类型表';

-- 分类表（支持层级结构）
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '分类名称',
    slug VARCHAR(100) NOT NULL COMMENT '分类路径标识',
    parent_id INT NULL COMMENT '父分类ID',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    description TEXT COMMENT '分类描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_sort_order (sort_order),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) COMMENT '分类表';

-- 标签表
CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '标签名称',
    slug VARCHAR(100) NOT NULL UNIQUE COMMENT '标签路径标识',
    count INT DEFAULT 0 COMMENT '使用次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_count (count)
) COMMENT '标签表';

-- 内容主表
CREATE TABLE contents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_type_id INT NOT NULL COMMENT '内容类型ID',
    category_id INT NULL COMMENT '分类ID',
    title VARCHAR(500) NOT NULL COMMENT '标题',
    slug VARCHAR(500) NOT NULL COMMENT 'URL路径标识',
    description TEXT COMMENT '描述/摘要',
    content LONGTEXT NOT NULL COMMENT '内容（支持Markdown/MDX）',
    content_format ENUM('markdown', 'mdx', 'html', 'plain') DEFAULT 'mdx' COMMENT '内容格式',
    
    -- 状态和发布控制
    status ENUM('draft', 'published', 'archived', 'hidden') DEFAULT 'draft' COMMENT '状态',
    published_at TIMESTAMP NULL COMMENT '发布时间',
    
    -- SEO和元数据
    meta_title VARCHAR(500) COMMENT 'SEO标题',
    meta_description TEXT COMMENT 'SEO描述',
    meta_keywords TEXT COMMENT 'SEO关键词',
    
    -- 统计信息
    word_count INT DEFAULT 0 COMMENT '字数',
    reading_time INT DEFAULT 0 COMMENT '阅读时间（分钟）',
    view_count BIGINT DEFAULT 0 COMMENT '查看次数',
    
    -- 来源信息（用于weekly内容）
    source VARCHAR(200) COMMENT '来源',
    source_url VARCHAR(1000) COMMENT '来源链接',
    
    -- 排序和组织
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    featured BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_content_type (content_type_id),
    INDEX idx_category (category_id),
    INDEX idx_status_published (status, published_at),
    INDEX idx_slug (slug),
    INDEX idx_featured (featured),
    INDEX idx_created (created_at),
    INDEX idx_updated (updated_at),
    FULLTEXT INDEX idx_search (title, description, content),
    
    -- 外键约束
    FOREIGN KEY (content_type_id) REFERENCES content_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    
    -- 唯一约束
    UNIQUE KEY uk_content_type_slug (content_type_id, slug)
) COMMENT '内容主表' ENGINE=InnoDB;

-- 内容标签关联表
CREATE TABLE content_tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_id BIGINT NOT NULL COMMENT '内容ID',
    tag_id INT NOT NULL COMMENT '标签ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_content (content_id),
    INDEX idx_tag (tag_id),
    UNIQUE KEY uk_content_tag (content_id, tag_id),
    
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) COMMENT '内容标签关联表';

-- 周刊期号表（特殊的内容组织方式）
CREATE TABLE weekly_issues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    issue_number INT NOT NULL UNIQUE COMMENT '期号',
    title VARCHAR(500) NOT NULL COMMENT '标题',
    slug VARCHAR(100) NOT NULL UNIQUE COMMENT '路径标识',
    description TEXT COMMENT '描述',
    
    -- 时间范围
    start_date DATE NOT NULL COMMENT '开始日期',
    end_date DATE NOT NULL COMMENT '结束日期',
    published_at TIMESTAMP NULL COMMENT '发布时间',
    
    -- 统计信息
    total_items INT DEFAULT 0 COMMENT '包含条目数',
    total_word_count INT DEFAULT 0 COMMENT '总字数',
    reading_time INT DEFAULT 0 COMMENT '阅读时间',
    
    -- 状态
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_issue_number (issue_number),
    INDEX idx_date_range (start_date, end_date),
    INDEX idx_status_published (status, published_at)
) COMMENT '周刊期号表';

-- 周刊内容关联表
CREATE TABLE weekly_content_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    weekly_issue_id INT NOT NULL COMMENT '周刊期号ID',
    content_id BIGINT NOT NULL COMMENT '内容ID',
    sort_order INT DEFAULT 0 COMMENT '在周刊中的排序',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_weekly_issue (weekly_issue_id),
    INDEX idx_content (content_id),
    INDEX idx_sort_order (sort_order),
    UNIQUE KEY uk_weekly_content (weekly_issue_id, content_id),
    
    FOREIGN KEY (weekly_issue_id) REFERENCES weekly_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
) COMMENT '周刊内容关联表';

-- 内容扩展属性表（用于存储灵活的键值对属性）
CREATE TABLE content_attributes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_id BIGINT NOT NULL COMMENT '内容ID',
    attribute_key VARCHAR(100) NOT NULL COMMENT '属性键',
    attribute_value TEXT COMMENT '属性值',
    attribute_type ENUM('string', 'number', 'boolean', 'json', 'date') DEFAULT 'string' COMMENT '属性类型',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_content (content_id),
    INDEX idx_key (attribute_key),
    UNIQUE KEY uk_content_attribute (content_id, attribute_key),
    
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
) COMMENT '内容扩展属性表';

-- 内容关系表（用于处理内容之间的关联）
CREATE TABLE content_relations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    from_content_id BIGINT NOT NULL COMMENT '源内容ID',
    to_content_id BIGINT NOT NULL COMMENT '目标内容ID',
    relation_type ENUM('related', 'reference', 'series', 'parent', 'child') NOT NULL COMMENT '关系类型',
    sort_order INT DEFAULT 0 COMMENT '排序',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_from_content (from_content_id),
    INDEX idx_to_content (to_content_id),
    INDEX idx_relation_type (relation_type),
    UNIQUE KEY uk_content_relation (from_content_id, to_content_id, relation_type),
    
    FOREIGN KEY (from_content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (to_content_id) REFERENCES contents(id) ON DELETE CASCADE
) COMMENT '内容关系表';

-- 插入基础数据
INSERT INTO content_types (name, slug, description) VALUES 
('周刊', 'weekly', '周刊内容类型'),
('博客', 'blog', '博客文章类型');

-- 插入周刊分类
INSERT INTO categories (name, slug, sort_order, description) VALUES 
('工具', 'tools', 1, '实用工具推荐'),
('文章', 'articles', 2, '优质文章分享'),
('教程', 'tutorials', 3, '学习教程'),
('言论', 'quotes', 4, '精彩言论'),
('bug', 'bugs', 5, 'Bug分析'),
('面试题', 'interviews', 6, '面试题目'),
('repos', 'repos', 7, '开源项目'),
('bigones', 'bigones', 8, '重要资源'),
('网站', 'websites', 9, '网站推荐'),
('prompt', 'prompts', 10, 'AI提示词'),
('demo', 'demos', 11, '演示项目'),
('开源', 'open-source', 12, '开源项目和资源'),
('资源', 'resources', 13, '各类资源分享'),
('技巧', 'tips', 14, '实用技巧'),
('经验', 'experience', 15, '经验分享'),
('技术', 'technology', 16, '技术相关'),
('博客', 'blogs', 17, '博客推荐'),
('AI', 'ai', 18, 'AI相关内容'),
('博主', 'bloggers', 19, '博主推荐'),
('教育', 'education', 20, '教育资源'),
('开发工具', 'dev-tools', 21, '开发工具'),
('讨论', 'discussion', 22, '技术讨论'),
('观点', 'opinions', 23, '观点分享'),
('读书', 'reading', 24, '读书相关'),
('访谈', 'interviews', 25, '访谈内容'),
('设计', 'design', 26, '设计相关'),
('服务', 'services', 27, '在线服务'),
('思考', 'thoughts', 28, '思考感悟'),
('应用', 'applications', 29, '应用推荐'),
('平台', 'platforms', 30, '平台介绍'),
('安全', 'security', 31, '安全相关'),
('健康', 'health', 32, '健康相关'),
('书籍', 'books', 33, '书籍推荐'),
('专栏', 'columns', 34, '专栏内容');

-- 插入博客分类（根据现有的blogs目录结构）
INSERT INTO categories (name, slug, description) VALUES 
('V8引擎', 'v8', 'V8引擎相关技术文章'),
('HTTP协议', 'http', 'HTTP协议深度解析'),
('Pixi.js', 'pixijs', 'Pixi.js游戏引擎技术'),
('VSCode扩展', 'vscode-extension', 'VSCode扩展开发'),
('国际化', 'i18next', 'i18next国际化框架'),
('WebSocket', 'websocket', 'WebSocket实时通信'),
('浏览器技术', 'browser', '浏览器底层技术'),
('React框架', 'react', 'React前端框架'),
('前端工程化', 'frontend-engineering', '前端工程化实践'),
('前端架构', 'frontend-architecture', '前端架构设计'),
('CSS技术', 'css', 'CSS样式技术'),
('Bug解决', 'bug-fixes', 'Bug修复案例'); 