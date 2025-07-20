#!/usr/bin/env node
import { initDatabase, query } from '../lib/database'

async function checkContentsTable() {
  await initDatabase()

  console.log('Contents 表字段结构:')
  const result = await query('DESCRIBE contents')
  result.forEach((row: any) => {
    console.log(`${row.Field} (${row.Type})`)
  })
}

checkContentsTable().catch(console.error) 