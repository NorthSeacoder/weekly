#!/bin/bash

# 验证 Cursor 规则配置

echo "验证 Cursor 规则配置..."
echo "=============================="

# 检查 .cursor/rules 目录是否存在
if [ ! -d ".cursor/rules" ]; then
  echo "错误：.cursor/rules 目录不存在！"
  exit 1
fi

# 检查核心规则文件
if [ ! -f ".cursor/rules/001-core.mdc" ]; then
  echo "错误：核心规则文件 001-core.mdc 不存在！"
  exit 1
fi

# 检查映射文件
if [ ! -f ".cursor/rules/000-mapping.mdc" ]; then
  echo "错误：映射规则文件 000-mapping.mdc 不存在！"
  exit 1
fi

# 检查sections规则
if [ ! -f ".cursor/rules/101-sections.mdc" ]; then
  echo "错误：sections规则文件 101-sections.mdc 不存在！"
  exit 1
fi

# 检查blogs规则
if [ ! -f ".cursor/rules/102-blogs.mdc" ]; then
  echo "错误：blogs规则文件 102-blogs.mdc 不存在！"
  exit 1
fi

echo "所有规则文件已存在，配置看起来正确！"
echo ""
echo "规则文件列表："
ls -la .cursor/rules/

echo ""
echo "提示：在 Cursor 编辑器中打开 sections/ 或 blogs/ 目录下的文件时，"
echo "将自动应用相应的规则。请尝试编辑这些目录下的文件来测试规则。"

exit 0 