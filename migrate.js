const { createClient } = require('@sanity/client');
const fs = require('fs');

// 1. 配置你的 Sanity 数据库信息
const client = createClient({
  projectId: 'sow12t1i', // 在 miwang-cms/sanity.config.ts 里可以找到
  dataset: 'production',
  useCdn: false,
  token: 'sk4rKb3Dec1VZdv6V4vis1nZotjf154i6P9ZQiOBbCPHjnToxlq05YK7p7mdmzopLKotF6mUZ3wImlCfJ95Irclb4b6dNogDiZ9eHyJHNh6eyc5ostBayHDFK8cdOjcf1Nzbj74mdhsrtfbsxLpeT0c7bc8XEsc5Y6BtgoPHjzoB1DuFgRmi', // 粘贴在这里
  apiVersion: '2024-04-16'
});

// 2. 读取你本地的 JSON 文件
const songsData = JSON.parse(fs.readFileSync('./data/songs.json', 'utf-8'));
const sentencesData = JSON.parse(fs.readFileSync('./data/sentences.json', 'utf-8'));
const booksData = JSON.parse(fs.readFileSync('./data/books.json', 'utf-8'));
const sightWordsData = JSON.parse(fs.readFileSync('./data/sight_words.json', 'utf-8'));
const poemsData = JSON.parse(fs.readFileSync('./data/poems.json', 'utf-8'));

async function migrate() {
  console.log('🚀 开始向 Sanity 云端迁移数据...');

  console.log('🎵 正在迁移 儿歌...');
  for (const song of songsData.song_list) {
    await client.create({
      _type: 'song',
      id: song.id,
      title: song.title,
      youtubeId: song.youtubeId || '',
      startTime: song.startTime || 0,
      lyrics: song.lyrics || ''
    });
  }

  console.log('🧩 正在迁移 句子排排队...');
  for (const sentence of sentencesData.sentence_list) {
    await client.create({
      _type: 'sentence',
      words: sentence.words,
      punctuation: sentence.punctuation || '',
      tags: sentence.tags || ''
    });
  }

  console.log('📚 正在迁移 分级绘本...');
  for (const book of booksData.book_list) {
    await client.create({
      _type: 'book',
      title: book.title,
      level: book.level,
      topic: book.topic,
      vocab_tags: book.vocab_tags || '',
      pages: book.pages ? book.pages.map((p, i) => ({
        _key: `page-${i}`, // Sanity 的数组需要一个唯一的 key
        text: p.text || ''
      })) : []
    });
  }

  console.log('🔤 正在迁移 四会字...');
  for (const word of sightWordsData.sight_words_list) {
    await client.create({
      _type: 'word',
      char: word.char,
      week: word.week,
      phrases: word.phrases || ''
    });
  }

  console.log('📜 正在迁移 古诗与顺口溜...');
  for (const poem of poemsData.poem_list) {
    await client.create({
      _type: 'poem',
      id: poem.id,
      title: poem.title,
      youtubeId: poem.youtubeId || '',
      startTime: poem.startTime || 0,
      lyrics: poem.lyrics || ''
    });
  }

  console.log('🎉 恭喜！全部文本数据迁移完成！快去后台看看吧！');
}

migrate().catch(console.error);