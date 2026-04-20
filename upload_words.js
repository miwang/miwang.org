const { createClient } = require('@sanity/client');
const fs = require('fs');

const client = createClient({
  projectId: 'sow12t1i', // 在 miwang-cms/sanity.config.ts 里找
  dataset: 'production',
  useCdn: false,
  token: 'sk4rKb3Dec1VZdv6V4vis1nZotjf154i6P9ZQiOBbCPHjnToxlq05YK7p7mdmzopLKotF6mUZ3wImlCfJ95Irclb4b6dNogDiZ9eHyJHNh6eyc5ostBayHDFK8cdOjcf1Nzbj74mdhsrtfbsxLpeT0c7bc8XEsc5Y6BtgoPHjzoB1DuFgRmi', // 填入你的 Token
  apiVersion: '2024-04-16'
});

async function migrateSightWordPhrases() {
  console.log('🚀 开始全自动处理【四会字】配图 (防弹断点续传版)...\n');

  const localData = JSON.parse(fs.readFileSync('./data/sight_words.json', 'utf-8')).sight_words_list;
  const sanityWords = await client.fetch('*[_type == "word"]');

  for (const doc of sanityWords) {
    const localCharData = localData.find(item => item.char === doc.char);
    if (!localCharData || !localCharData.phrases) continue;

    console.log(`\n📝 正在检查: 【${doc.char}】`);

    const phraseArray = localCharData.phrases.split(',').map(s => s.trim()).filter(s => s);
    const phraseListToSave = [];
    let hasChanges = false; // 记录是否有新图上传

    for (let i = 0; i < phraseArray.length; i++) {
      const phraseText = phraseArray[i];
      const imagePath = `./images/sight_words_phrases/${phraseText}.webp`;
      
      // 核心逻辑：检查云端是否已经存在这张图
      const existingPhrase = (doc.phrase_list || []).find(p => p.text === phraseText);
      let assetRef = existingPhrase && existingPhrase.image ? existingPhrase.image : null;

      // 如果云端没有图，且本地有图，则发起上传
      if (!assetRef && fs.existsSync(imagePath)) {
        try {
          console.log(`  ⬆️ 正在上传: ${phraseText}.webp`);
          const asset = await client.assets.upload('image', fs.createReadStream(imagePath), {
            filename: `${phraseText}.webp`
          });
          assetRef = { _type: 'image', asset: { _ref: asset._id } };
          hasChanges = true;
        } catch (error) {
          // 防弹衣：如果 502 报错，只打印警告，不中断整个脚本
          console.log(`  ❌ 上传失败跳过 (${phraseText}.webp): ${error.message}`);
        }
      } else if (assetRef) {
         console.log(`  ⏩ 已存在，自动跳过: ${phraseText}`);
      } else {
         console.log(`  ⚠️ 找不到本地图片: ${phraseText}.webp`);
      }

      phraseListToSave.push({
        _key: existingPhrase?._key || `phrase-${i}-${Date.now()}`, 
        text: phraseText,
        image: assetRef
      });
    }

    // 只有当这个汉字底下真的有新图上传时，才去向云端保存，节省请求次数
    if (hasChanges) {
      try {
        await client.patch(doc._id).set({ phrase_list: phraseListToSave }).commit();
        console.log(`  ✅ 【${doc.char}】数据更新成功！`);
      } catch (err) {
        console.log(`  ❌ 【${doc.char}】数据保存失败: ${err.message}`);
      }
    }
  }

  console.log('\n🎉 完美收工！所有任务执行完毕。');
}

migrateSightWordPhrases().catch(console.error);