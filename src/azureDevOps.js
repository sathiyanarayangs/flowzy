const https = require('https');

class AzureDevOpsClient {
  constructor(orgUrl, project, pat) {
    this.orgUrl = orgUrl.replace(/\/$/, '');
    this.project = project;
    this.token = Buffer.from(`:${pat}`).toString('base64');
  }

  _request(path) {
    return new Promise((resolve, reject) => {
      const url = `${this.orgUrl}/${encodeURIComponent(this.project)}/_apis${path}`;
      const parsed = new URL(url);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { Authorization: `Basic ${this.token}`, 'Content-Type': 'application/json' },
      };
      https.get(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const p = JSON.parse(data);
            if (p.message && !p.fields) reject(new Error(p.message));
            else resolve(p);
          } catch (e) { reject(new Error('Invalid response from Azure DevOps')); }
        });
      }).on('error', reject);
    });
  }

  async getWorkItem(id) {
    const fields = [
      'System.Title','System.Description',
      'Microsoft.VSTS.Common.AcceptanceCriteria',
      'System.State','System.WorkItemType',
      'Microsoft.VSTS.Scheduling.StoryPoints',
      'System.AssignedTo'
    ].join(',');
    return this._request(`/wit/workitems/${id}?fields=${fields}&api-version=7.0`);
  }
}

module.exports = AzureDevOpsClient;
