const clientsByUser = new Map();

const normalizeUserId = (value) => {
  if (!value) return "";
  return String(value._id || value);
};

const writeEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload || {})}\n\n`);
};

const registerClient = (userId, res) => {
  const key = normalizeUserId(userId);
  if (!key) return () => {};

  const current = clientsByUser.get(key) || new Set();
  current.add(res);
  clientsByUser.set(key, current);

  writeEvent(res, "ready", { ok: true, userId: key, connectedAt: new Date().toISOString() });

  return () => {
    const clients = clientsByUser.get(key);
    if (!clients) return;
    clients.delete(res);
    if (clients.size === 0) {
      clientsByUser.delete(key);
    }
  };
};

const publishToUser = (userId, event, payload) => {
  const key = normalizeUserId(userId);
  const clients = clientsByUser.get(key);
  if (!clients || clients.size === 0) return 0;

  let delivered = 0;
  clients.forEach((res) => {
    try {
      writeEvent(res, event, payload);
      delivered += 1;
    } catch {
      clients.delete(res);
    }
  });

  if (clients.size === 0) {
    clientsByUser.delete(key);
  }
  return delivered;
};

const publishToUsers = (userIds, event, payload) => {
  const uniqueIds = Array.from(new Set((userIds || []).map(normalizeUserId).filter(Boolean)));
  return uniqueIds.reduce((count, userId) => count + publishToUser(userId, event, payload), 0);
};

const getClientCount = () =>
  Array.from(clientsByUser.values()).reduce((count, clients) => count + clients.size, 0);

module.exports = {
  getClientCount,
  publishToUser,
  publishToUsers,
  registerClient
};
