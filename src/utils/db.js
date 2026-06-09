import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { encrypt, decrypt } from './crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'noir_chat.db');
const db = new sqlite3.Database(dbPath);

// Promisified DB helpers
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Initialize SQLite tables.
 */
export async function initDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration helper: check if we need to add thread_id column (in case table existed)
  try {
    await runQuery('ALTER TABLE messages ADD COLUMN thread_id TEXT');
  } catch (err) {
    // column already exists, safe to ignore
  }
}

/**
 * Creates a new chat thread.
 * 
 * @param {string} id Unique thread identifier
 * @param {string} title Readable thread title
 * @returns {Promise<void>}
 */
export async function createThread(id, title) {
  if (!id || !title) return;
  await runQuery(
    'INSERT OR IGNORE INTO threads (id, title) VALUES (?, ?)',
    [id, title]
  );
}

/**
 * Renames a chat thread.
 * 
 * @param {string} id Unique thread identifier
 * @param {string} title New readable title
 * @returns {Promise<void>}
 */
export async function renameThread(id, title) {
  if (!id || !title) return;
  await runQuery(
    'UPDATE threads SET title = ? WHERE id = ?',
    [title, id]
  );
}


/**
 * Retrieves all chat threads.
 * 
 * @returns {Promise<Array<Object>>} List of threads
 */
export async function getThreads() {
  return allQuery('SELECT id, title, created_at FROM threads ORDER BY created_at DESC');
}

/**
 * Deletes a chat thread and all its messages.
 * 
 * @param {string} id Thread identifier
 * @returns {Promise<void>}
 */
export async function deleteThread(id) {
  if (!id) return;
  await runQuery('DELETE FROM messages WHERE thread_id = ?', [id]);
  await runQuery('DELETE FROM threads WHERE id = ?', [id]);
}

/**
 * Saves a chat message to SQLite, encrypting its contents first.
 * 
 * @param {string} threadId Target thread ID
 * @param {string} role 'user' | 'assistant'
 * @param {string} content Cleartext message body
 * @returns {Promise<void>}
 */
export async function saveMessage(threadId, role, content) {
  if (!threadId || !role || !content) return;
  
  const encRole = encrypt(role);
  const encContent = encrypt(content);
  
  await runQuery(
    'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)',
    [threadId, encRole, encContent]
  );
}

/**
 * Retrieves the last N messages from SQLite for a specific thread, decrypting them.
 * Returns messages in chronological order.
 * 
 * @param {string} threadId Thread identifier
 * @param {number} limit Number of messages to retrieve
 * @returns {Promise<Array<Object>>} Array of cleartext { role, content, timestamp }
 */
export async function getLastMessages(threadId, limit = 5) {
  if (!threadId) return [];

  // Query descending to get the most recent, then reverse to output chronological order
  const rows = await allQuery(
    'SELECT role, content, timestamp FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT ?',
    [threadId, limit]
  );

  return rows
    .map(row => ({
      role: decrypt(row.role),
      content: decrypt(row.content),
      timestamp: row.timestamp
    }))
    .reverse();
}

/**
 * Clears the chat message history for a specific thread.
 * 
 * @param {string} threadId Thread identifier
 * @returns {Promise<void>}
 */
export async function clearHistory(threadId) {
  if (!threadId) return;
  await runQuery('DELETE FROM messages WHERE thread_id = ?', [threadId]);
}

