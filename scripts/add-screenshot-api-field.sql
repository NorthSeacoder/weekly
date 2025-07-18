-- 添加 screenshot_api 字段的数据库迁移脚本
-- 执行日期: 2025-01-27
-- 目的: 为周刊内容添加截图API类型属性

-- 添加新字段到 contents 表
ALTER TABLE contents 
ADD COLUMN screenshot_api ENUM('ScreenshotLayer', 'HCTI', 'manual') DEFAULT 'manual' COMMENT '截图API类型'
AFTER source_url;

-- 为现有数据设置默认值（实际上 DEFAULT 'manual' 已经处理了这个）
UPDATE contents 
SET screenshot_api = 'manual' 
WHERE screenshot_api IS NULL;

-- 验证更新结果
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN screenshot_api = 'manual' THEN 1 END) as manual_count,
    COUNT(CASE WHEN screenshot_api = 'ScreenshotLayer' THEN 1 END) as screenshot_layer_count,
    COUNT(CASE WHEN screenshot_api = 'HCTI' THEN 1 END) as hcti_count
FROM contents;

-- 显示表结构确认字段已添加
DESCRIBE contents; 