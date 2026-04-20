const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
  projectId: 'sow12t1i', // 在 miwang-cms/sanity.config.ts 里找
  dataset: 'production',
  useCdn: false,
  token: 'sk4rKb3Dec1VZdv6V4vis1nZotjf154i6P9ZQiOBbCPHjnToxlq05YK7p7mdmzopLKotF6mUZ3wImlCfJ95Irclb4b6dNogDiZ9eHyJHNh6eyc5ostBayHDFK8cdOjcf1Nzbj74mdhsrtfbsxLpeT0c7bc8XEsc5Y6BtgoPHjzoB1DuFgRmi', // 填入你的 Token
  apiVersion: '2024-04-16'
});

// 一个通用的小助手函数：负责把本地图片传上云端并绑定到对应的字段
async function uploadAndBind(localUrl, docId, fieldName) {
  if (!localUrl) return;
  
  // 智能修正路径：把旧数据里的 ../images 或 /images 统一变成 ./images
  let cleanPath = localUrl.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
  if (!cleanPath.startsWith('images/')) cleanPath = 'images/' + cleanPath;
  cleanPath = './' + cleanPath;

  if (fs.existsSync(cleanPath)) {
    console.log(`⬆️ 正在上传: ${cleanPath}`);
    const asset = await client.assets.upload('image', fs.createReadStream(cleanPath), {
      filename: path.basename(cleanPath)
    });
    
    // 告诉 Sanity：把这张图绑定到这个 ID 的文档的这个字段上
    const patchObj = {};
    patchObj[fieldName] = { _type: 'image', asset: { _ref: asset._id } };
    await client.patch(docId).set(patchObj).commit();
  } else {
    console.log(`⚠️ 找不到本地图片，已跳过: ${cleanPath}`);
  }
}

async function uploadAllImages() {
  console.log('🚀 终极图片全自动升空程序启动！\n');

  // 读取本地 JSON 数据作为线索
  const songsData = JSON.parse(fs.readFileSync('./data/songs.json', 'utf-8')).song_list;
  const poemsData = JSON.parse(fs.readFileSync('./data/poems.json', 'utf-8')).poem_list;
  const sentencesData = JSON.parse(fs.readFileSync('./data/sentences.json', 'utf-8')).sentence_list;
  const booksData = JSON.parse(fs.readFileSync('./data/books.json', 'utf-8')).book_list;

  // ================= 1. 儿歌封面 =================
  console.log('🎵 正在处理【儿歌】...');
  const sanitySongs = await client.fetch('*[_type == "song" && !defined(cover)]');
  for (const doc of sanitySongs) {
    const local = songsData.find(s => s.id === doc.id);
    if (local && local.cover) await uploadAndBind(local.cover, doc._id, 'cover');
  }

  // ================= 2. 古诗封面 =================
  console.log('\n📜 正在处理【古诗与顺口溜】...');
  const sanityPoems = await client.fetch('*[_type == "poem" && !defined(cover)]');
  for (const doc of sanityPoems) {
    const local = poemsData.find(p => p.id === doc.id);
    if (local && local.cover) await uploadAndBind(local.cover, doc._id, 'cover');
  }

  // ================= 3. 句子排排队 =================
  console.log('\n🧩 正在处理【句子排排队】...');
  const sanitySentences = await client.fetch('*[_type == "sentence" && !defined(image)]');
  for (const doc of sanitySentences) {
    const local = sentencesData.find(s => s.words === doc.words);
    if (local && local.image) await uploadAndBind(local.image, doc._id, 'image');
  }

  // ================= 4. 高频四会字 =================
  console.log('\n🔤 正在处理【高频四会字】...');
  const sanityWords = await client.fetch('*[_type == "word" && !defined(image)]');
  for (const doc of sanityWords) {
    const imagePath = `./images/sight_words_phrases/${doc.char}.webp`;
    await uploadAndBind(imagePath, doc._id, 'image');
  }

  // ================= 5. 分级绘本馆 =================
  console.log('\n📚 正在处理【分级绘本馆】(包含封面和每一页的插图)...');
  const sanityBooks = await client.fetch('*[_type == "book"]');
  for (const doc of sanityBooks) {
    const local = booksData.find(b => b.title === doc.title);
    if (!local) continue;

    // 5.1 传封面
    if (!doc.coverImage && local.coverImage) {
      await uploadAndBind(local.coverImage, doc._id, 'coverImage');
    }

    // 5.2 传每一页的插图 (这个最省事了！)
    if (local.pages && local.pages.length > 0) {
      for (let i = 0; i < local.pages.length; i++) {
        // 如果本地有图，且云端这一页还没绑图
        if (local.pages[i].image && (!doc.pages || !doc.pages[i] || !doc.pages[i].image)) {
          let cleanPath = local.pages[i].image.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
          if (!cleanPath.startsWith('images/')) cleanPath = 'images/' + cleanPath;
          cleanPath = './' + cleanPath;

          if (fs.existsSync(cleanPath)) {
            console.log(`  📖 上传绘本《${doc.title}》第 ${i+1} 页插图: ${cleanPath}`);
            const asset = await client.assets.upload('image', fs.createReadStream(cleanPath), { filename: path.basename(cleanPath) });
            // 精准绑定到数组里的特定一页
            await client.patch(doc._id).set({ [`pages[${i}].image`]: { _type: 'image', asset: { _ref: asset._id } } }).commit();
          }
        }
      }
    }
  }

  console.log('\n🎉 太完美了！所有的图片都已经自动升空并精准归位！');
}

uploadAllImages().catch(console.error);