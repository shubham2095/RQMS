// LIKE search ke liye user text se wildcard (% _ \) hata do, phir %text% banao.
function likePattern(text) {
  return `%${String(text).replace(/[\\%_]/g, '\\$&')}%`;
}

module.exports = { likePattern };
