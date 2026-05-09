class RecordsManager {
  constructor(storage) { this.storage = storage; }

  getRecords() {
    const r = this.storage.loadRecords();
    if (!r.completedTicketIds || !Array.isArray(r.completedTicketIds)) r.completedTicketIds = [];
    if (!r.completedTickets) r.completedTickets = [];
    return r;
  }

  async recordTicketCompletion(ticketId, ticketTitle, totalSeconds, stepsCount) {
    const records = this.getRecords();
    const ids = records.completedTicketIds;
    const isNew = !ids.includes(ticketId);

    const oldEntry = records.completedTickets.find(t => t.id === ticketId);
    records.completedTickets = records.completedTickets.filter(t => t.id !== ticketId);

    const entry = {
      id: ticketId,
      title: ticketTitle,
      timeSpent: Math.max(0, totalSeconds),
      stepsCount,
      date: new Date().toISOString(),
    };

    records.completedTickets = [entry, ...records.completedTickets].slice(0, 50);

    if (isNew) ids.push(ticketId);
    records.completedTicketIds = ids;
    records.totalTicketsDone = ids.length;

    const oldTime = oldEntry?.timeSpent || 0;
    records.totalTimeSpent = Math.max(0, (records.totalTimeSpent || 0) - oldTime + entry.timeSpent);

    if (entry.timeSpent > 0) {
      if (!records.fastestTicket || entry.timeSpent < records.fastestTicket.timeSpent) {
        records.fastestTicket = entry;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const streak = records.streak || { current: 0, best: 0, lastDate: null };
    if (streak.lastDate !== today) {
      streak.current = streak.lastDate === yesterday ? streak.current + 1 : 1;
      streak.best = Math.max(streak.best, streak.current);
      streak.lastDate = today;
    }
    records.streak = streak;

    await this.storage.saveRecords(records);
    return records;
  }

  async uncompleteTicket(ticketId) {
    const records = this.getRecords();
    const entry = records.completedTickets.find(t => t.id === ticketId);

    records.completedTicketIds = records.completedTicketIds.filter(id => id !== ticketId);
    records.completedTickets = records.completedTickets.filter(t => t.id !== ticketId);
    records.totalTicketsDone = records.completedTicketIds.length;

    if (entry?.timeSpent) {
      records.totalTimeSpent = Math.max(0, (records.totalTimeSpent || 0) - entry.timeSpent);
    }

    if (records.fastestTicket?.id === ticketId) {
      records.fastestTicket = records.completedTickets.length > 0
        ? records.completedTickets.reduce((a, b) => a.timeSpent < b.timeSpent ? a : b)
        : null;
    }

    await this.storage.saveRecords(records);
    return records;
  }
}

module.exports = RecordsManager;