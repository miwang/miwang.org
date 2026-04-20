const { createClient } = require('@sanity/client');
const fs = require('fs');

const client = createClient({
  projectId: 'sow12t1i', // 填入你的 Project ID
  dataset: 'production',
  useCdn: false,
  token: 'sk4rKb3Dec1VZdv6V4vis1nZotjf154i6P9ZQiOBbCPHjnToxlq05YK7p7mdmzopLKotF6mUZ3wImlCfJ95Irclb4b6dNogDiZ9eHyJHNh6eyc5ostBayHDFK8cdOjcf1Nzbj74mdhsrtfbsxLpeT0c7bc8XEsc5Y6BtgoPHjzoB1DuFgRmi', // 填入你的 Token
  apiVersion: '2024-04-16'
});

async function fixCenterImages() {
  console.log('🖼️ 开始补漏：专门上传【中心汉字】的配图...\n');

  // 找出所有“中心字配图 (image)”还是空的文档
  const wordsToFix = await client.fetch('*[_type == "word" && !defined(image)]');

  for (const doc of wordsToFix) {
    // 按照你之前的命名规律，寻找中心字的本地图片
    const imagePath = `./images/sight_words_phrases/${doc.char}.webp`;

    if (fs.existsSync(imagePath)) {
      try {
        console.log(`  ⬆️ 正在上传中心字配图: ${doc.char}.webp`);
        const asset = await client.assets.upload('image', fs.createReadStream(imagePath), {
          filename: `${doc.char}.webp`
        });
        
        // 专门把这张图绑定到中心字的 image 字段上
        await client.patch(doc._id)
          .set({ image: { _type: 'image', asset: { _ref: asset._id } } })
          .commit();
          
        console.log(`  ✅ 【${doc.char}】中心图绑定成功！`);
      } catch (error) {
         console.log(`  ❌ 上传失败 (${doc.char}.webp): ${error.message}`);
      }
    } else {
      console.log(`  ⚠️ 本地找不到该图，已跳过: ${imagePath}`);
    }
  }

  console.log('\n🎉 补漏完成！所有中心汉字的图片都已经就位啦！');
}

fixCenterImages().catch(console.error);