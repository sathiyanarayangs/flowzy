class StorageManager {
  constructor(context) { this.storage = context.globalState; }
  _key(id) { return `flowzy_${id}`; }
  save(id, data) { return this.storage.update(this._key(id), { ...data, savedAt: Date.now() }); }
  load(id) { return this.storage.get(this._key(id), null); }
  delete(id) { return this.storage.update(this._key(id), undefined); }
  listAll() { return this.storage.keys().filter(k => k.startsWith('flowzy_ticket_') || k.startsWith('flowzy_')).map(k => k.replace('flowzy_', '')); }
  saveConfig(config) { return this.storage.update('flowzy_config', config); }
  loadConfig() { return this.storage.get('flowzy_config', null); }
  saveRecords(data) { return this.storage.update('flowzy_records', data); }
  loadRecords() { return this.storage.get('flowzy_records', { completedTicketIds: new Set(), totalTicketsDone: 0, totalTimeSpent: 0, fastestTicket: null, completedTickets: [], streak: { current: 0, best: 0, lastDate: null } }); }
}
module.exports = StorageManager;
