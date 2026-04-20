const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'sow12t1i', // 在 miwang-cms/sanity.config.ts 里找
  dataset: 'production',
  useCdn: false,
  token: 'sk4rKb3Dec1VZdv6V4vis1nZotjf154i6P9ZQiOBbCPHjnToxlq05YK7p7mdmzopLKotF6mUZ3wImlCfJ95Irclb4b6dNogDiZ9eHyJHNh6eyc5ostBayHDFK8cdOjcf1Nzbj74mdhsrtfbsxLpeT0c7bc8XEsc5Y6BtgoPHjzoB1DuFgRmi', // 填入你的 Token
  apiVersion: '2024-04-16'
});

async function cleanupOldPhrases() {
  console.log('🧹 开始清理旧的遗留字段...');
  
  // 找出所有还残留着旧 'phrases' 字段的四会字文档
  const wordsToClean = await client.fetch('*[_type == "word" && defined(phrases)]');

  for (const doc of wordsToClean) {
    console.log(`  🗑️ 正在删除【${doc.char}】的旧 phrases 字段...`);
    // unset 就是告诉云端：把这个多余的字段抹除掉
    await client.patch(doc._id).unset(['phrases']).commit();
  }
  
  console.log('\n✨ 大扫除完成！后台现在干干净净了！');
}

cleanupOldPhrases().catch(console.error);