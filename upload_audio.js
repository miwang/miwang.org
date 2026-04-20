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

// 辅助函数：找音频文件（忽略后缀名大小写）
function findAudioFile(basePath, name) {
  const p1 = path.join(basePath, `${name}.mp3`);
  const p2 = path.join(basePath, `${name}.MP3`);
  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  return null;
}

async function migrateAudio() {
  console.log('🚀 开始全自动处理【四会字及扩展词语】的录音上传...\n');

  // 获取云端已经建好的四会字数据
  const sanityWords = await client.fetch('*[_type == "word"]');
  const audioBaseDir = './audio/sight_words_phrases';

  for (const doc of sanityWords) {
    console.log(`\n🎵 正在处理: 【${doc.char}】`);
    const patchData = {};

    // =====================================
    // 1. 处理中心汉字的录音 (例如: 手.mp3)
    // =====================================
    if (!doc.audio) {
      const charAudioPath = findAudioFile(audioBaseDir, doc.char);
      if (charAudioPath) {
        console.log(`  ⬆️ 上传中心字发音: ${path.basename(charAudioPath)}`);
        const asset = await client.assets.upload('file', fs.createReadStream(charAudioPath), {
          filename: path.basename(charAudioPath)
        });
        // 绑定资源ID
        patchData.audio = { _type: 'file', asset: { _ref: asset._id } };
      }
    }

    // =====================================
    // 2. 处理扩展词语的录音 (例如: 手机.mp3)
    // =====================================
    if (doc.phrase_list && doc.phrase_list.length > 0) {
      const updatedPhraseList = [...doc.phrase_list];
      let phraseUpdated = false;

      for (let i = 0; i < updatedPhraseList.length; i++) {
        const phrase = updatedPhraseList[i];
        if (!phrase.audio) {
          const phraseAudioPath = findAudioFile(audioBaseDir, phrase.text);
          if (phraseAudioPath) {
            console.log(`  ⬆️ 上传词语发音: ${path.basename(phraseAudioPath)}`);
            const asset = await client.assets.upload('file', fs.createReadStream(phraseAudioPath), {
              filename: path.basename(phraseAudioPath)
            });
            // 绑定到对应词语的 audio 字段
            updatedPhraseList[i].audio = { _type: 'file', asset: { _ref: asset._id } };
            phraseUpdated = true;
          }
        }
      }

      if (phraseUpdated) {
        patchData.phrase_list = updatedPhraseList;
      }
    }

    // =====================================
    // 3. 一次性提交修改
    // =====================================
    if (Object.keys(patchData).length > 0) {
      await client.patch(doc._id).set(patchData).commit();
      console.log(`  ✅ 【${doc.char}】录音绑定完成！`);
    } else {
      console.log(`  ⏩ 无新录音需要上传。`);
    }
  }

  console.log('\n🎉 完美收工！所有的录音文件都已经自动上云啦！');
}

migrateAudio().catch(console.error);