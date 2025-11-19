import Fuse from 'fuse.js';
import { db, MasterItem } from './db';

let fuse: Fuse<MasterItem> | null = null;
const options: Fuse.IFuseOptions<MasterItem> = {
  includeScore: true,
  threshold: 0.35,
  keys: ['nameNfkc','makerNfkc','model']
};

export async function buildIndex() {
  const items = await db.survey_masters.toArray();
  // 既存インデックス（高速起動用）
  try {
    const row = await db.indices.get('masters-fuse-index');
    if (row?.data) {
      const idx = Fuse.parseIndex<MasterItem>(row.data);
      fuse = new Fuse(items, options, idx);
      return;
    }
  } catch {}
  fuse = new Fuse(items, options);
  const idx = Fuse.createIndex(options.keys as any, items);
  await db.indices.put({ id: 'masters-fuse-index', data: idx.toJSON() });
}

export async function searchLocal(q: string, limit = 20) {
  if (!fuse) await buildIndex();
  const norm = q.normalize('NFKC');
  return fuse!.search(norm, { limit }).map(r => r.item);
}
