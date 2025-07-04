
import { config } from 'dotenv';
config();

import { getDatabase, query, closeDatabase } from './lib/database';

async function test() {
  console.log('环境变量:');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_NAME:', process.env.DB_NAME);
  
  try {
    const db = getDatabase();
    const result = await query('SELECT 1 as test');
    console.log('测试查询成功:', result);
    await closeDatabase();
  } catch(e) {
    console.log('测试失败:', e.message);
  }
}
test();

