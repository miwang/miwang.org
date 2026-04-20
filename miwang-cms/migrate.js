import {createClient} from '@sanity/client'

// 配置你的专属钥匙
const client = createClient({
  projectId: 'sow12t1i',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  // 👇 把你复制的那长串 token 粘贴在单引号里面
  token: 'sk4rKb3Dec1VZdv6V4vis1nZotjf154i6P9ZQiOBbCPHjnToxlq05YK7p7mdmzopLKotF6mUZ3wImlCfJ95Irclb4b6dNogDiZ9eHyJHNh6eyc5ostBayHDFK8cdOjcf1Nzbj74mdhsrtfbsxLpeT0c7bc8XEsc5Y6BtgoPHjzoB1DuFgRmi' 
})

async function migrateData() {
  console.log('🚀 开始扫描数据库...')
  
  const words = await client.fetch('*[_type == "word" && defined(week)]')
  
  if (words.length === 0) {
    console.log('✅ 没有发现需要迁移的旧数据。')
    return
  }

  console.log(`📦 发现 ${words.length} 个字需要迁移，正在处理...`)

  const transaction = client.transaction()
  
  words.forEach((word) => {
    transaction.patch(word._id, {
      set: { month: word.week }, // 把旧的 week 值给新的 month
      unset: ['week'],           // 删掉旧的 week 字段
    })
  })

  try {
    await transaction.commit()
    console.log('🎉 大功告成！所有数据已自动更新为 month 字段。')
  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
  }
}

migrateData()