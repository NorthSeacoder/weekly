#!/usr/bin/env node
import { initDatabase, query, execute } from '../lib/database'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import matter from 'gray-matter'

interface SourceSyncResult {
  totalFiles: number
  syncedFiles: number
  skippedFiles: number
  errors: string[]
}

async function syncSourceFields(): Promise<SourceSyncResult> {
  await initDatabase()
  const result: SourceSyncResult = {
    totalFiles: 0,
    syncedFiles: 0,
    skippedFiles: 0,
    errors: []
  }

  console.log('🔄 开始同步 source 字段...')

  try {
    // 扫描所有 sections 文件夹
    const sectionsPath = path.join(process.cwd(), 'sections')
    const yearFolders = readdirSync(sectionsPath)
      .filter(folder => folder.match(/^\d{4}-\d{2}$/))
      .sort()

    for (const yearFolder of yearFolders) {
      const yearPath = path.join(sectionsPath, yearFolder)
      const files = readdirSync(yearPath)
        .filter(file => file.endsWith('.mdx'))
        .sort()

      console.log(`📁 处理文件夹: ${yearFolder} (${files.length} 个文件)`)

      for (const file of files) {
        result.totalFiles++
        const filePath = path.join(yearPath, file)
        const relativePath = path.join('sections', yearFolder, file)

        try {
          // 读取文件内容
          const content = readFileSync(filePath, 'utf-8')
          const { data: frontmatter } = matter(content)

          // 检查是否有 source 字段
          if (!frontmatter.source) {
            console.log(`⚠️  跳过 ${relativePath} - 没有 source 字段`)
            result.skippedFiles++
            continue
          }

          // 更新数据库中的 source 字段
          const updateResult = await execute(
            `UPDATE contents SET source = ? WHERE file_path = ?`,
            [frontmatter.source, relativePath]
          )
          
          if (updateResult.affectedRows > 0) {
            console.log(`✅ 同步成功: ${relativePath}`)
            result.syncedFiles++
          } else {
            console.log(`❌ 同步失败: ${relativePath} - 数据库记录不存在`)
            result.errors.push(`${relativePath}: 数据库记录不存在`)
          }

        } catch (error) {
          console.error(`❌ 处理文件错误 ${relativePath}:`, error)
          result.errors.push(`${relativePath}: ${error.message}`)
        }
      }
    }

    console.log('\n📊 同步结果统计:')
    console.log(`- 总文件数: ${result.totalFiles}`)
    console.log(`- 同步成功: ${result.syncedFiles}`)
    console.log(`- 跳过文件: ${result.skippedFiles}`)
    console.log(`- 错误数量: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log('\n❌ 错误详情:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }

  } catch (error) {
    console.error('❌ 同步过程出错:', error)
    result.errors.push(`系统错误: ${error.message}`)
  }

  return result
}

// 如果直接运行这个脚本
if (require.main === module) {
  syncSourceFields()
    .then(result => {
      console.log('\n🎉 Source 字段同步完成!')
      process.exit(result.errors.length === 0 ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ 脚本执行失败:', error)
      process.exit(1)
    })
}

export { syncSourceFields } 