const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Starting webartests hub vector building process...');

  const { pipeline } = await import('@huggingface/transformers');

  const htmlPath = path.join(__dirname, 'index.html');
  const jsonPath = path.join(__dirname, 'shared/data/experiments.json');

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`index.html not found at: ${htmlPath}`);
  }
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`experiments.json not found at: ${jsonPath}`);
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const experimentsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const itemsToEmbed = [];

  // 1. Extract dynamic experiments shown on top level
  experimentsData.experiments.forEach(exp => {
    if (exp.showOnTopLevel) {
      const topicsStr = (exp.topics || []).map(t => t.label).join(', ');
      itemsToEmbed.push({
        id: `exp-${exp.id}`,
        title: exp.title,
        text: `${exp.title}. ${exp.description}. ${exp.tag || ''}. ${topicsStr}`
      });
    }
  });
  console.log(`Extracted ${itemsToEmbed.length} dynamic experiments.`);

  // 2. Extract static panels from index.html using regex
  // Bounded by the trailing <span class="tag"> tag to skip inner nested divs
  const cardRegex = /<div class="panel card-div">([\s\S]*?<span class="tag">[\s\S]*?<\/span>\s*<\/div>)/g;
  let match;
  let staticCount = 0;

  while ((match = cardRegex.exec(htmlContent)) !== null) {
    const cardHtml = match[1];

    // Extract Title (h2 link text)
    const titleMatch = /<h2><a href=".*?">([\s\S]*?)<\/a><\/h2>/.exec(cardHtml);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract Description (p text)
    const descMatch = /<p>([\s\S]*?)<\/p>/.exec(cardHtml);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract Tag (span class="tag" text)
    const tagMatch = /<span class="tag">([\s\S]*?)<\/span>/.exec(cardHtml);
    const tag = tagMatch ? tagMatch[1].trim() : '';

    // Extract Topic Chips (a class="card-topic" text)
    const topicRegex = /<a class="card-topic" href=".*?">([\s\S]*?)<\/a>/g;
    const topics = [];
    let topicMatch;
    while ((topicMatch = topicRegex.exec(cardHtml)) !== null) {
      topics.push(topicMatch[1].trim());
    }
    const topicsStr = topics.join(', ');

    if (title && description) {
      const id = `static-card-${staticCount++}`;
      itemsToEmbed.push({
        id,
        title,
        text: `${title}. ${description}. ${tag}. ${topicsStr}`
      });
    }
  }
  console.log(`Extracted ${staticCount} static panels from index.html.`);
  console.log(`Total items to embed: ${itemsToEmbed.length}`);

  // 3. Generate embeddings
  console.log('Loading Xenova/e5-small-v2 feature extraction pipeline...');
  const pipe = await pipeline('feature-extraction', 'Xenova/e5-small-v2');

  const meta = {
    model: 'Xenova/e5-small-v2',
    dimension: 384,
    items: []
  };

  const floatArray = [];

  for (let i = 0; i < itemsToEmbed.length; i++) {
    const item = itemsToEmbed[i];
    console.log(`[${i + 1}/${itemsToEmbed.length}] Embedding: ${item.title}`);

    // e5 requires 'passage: ' prefix
    const out = await pipe(['passage: ' + item.text], { pooling: 'mean', normalize: true });
    const vector = Array.from(out.data);

    meta.items.push({
      id: item.id,
      title: item.title,
      index: i
    });

    floatArray.push(...vector);
  }

  // Write files
  const metaPath = path.join(__dirname, 'search-vectors-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  console.log(`Wrote metadata file to: ${metaPath}`);

  const binPath = path.join(__dirname, 'search-vectors.bin');
  const buffer = Buffer.from(new Float32Array(floatArray).buffer);
  fs.writeFileSync(binPath, buffer);
  console.log(`Wrote binary vectors file to: ${binPath} (Size: ${buffer.length} bytes)`);

  console.log('Vector building process completed successfully!');
}

main().catch(err => {
  console.error('Vector build failed:', err);
  process.exit(1);
});
