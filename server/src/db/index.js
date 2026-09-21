import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite'; // built into Node 22.13+, so no native compilation is needed
import { migrate } from './migrations.js';

export function openDatabase(filename) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode = WAL;'); // readers don't block the writer
  migrate(db);
  return db;
}
