const https = require('https');

class JiraClient {
  constructor(baseUrl, email, apiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  _request(path) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const parsed = new URL(url);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          Authorization: `Basic ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };
      https.get(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const p = JSON.parse(data);
            if (p.errorMessages?.length) reject(new Error(p.errorMessages[0]));
            else resolve(p);
          } catch (e) { reject(new Error('Invalid response from Jira')); }
        });
      }).on('error', reject);
    });
  }

  async getIssue(issueKey) {
    // Fetch all possible acceptance criteria fields
    const fields = [
      'summary',
      'description',
      'status',
      'issuetype',
      'assignee',
      'story_points',
      'customfield_10016', // story points
      'customfield_10028', // acceptance criteria (some instances)
      'customfield_10029', // acceptance criteria (your instance)
      'customfield_10030', // acceptance criteria (other instances)
    ].join(',');
    return this._request(`/rest/api/2/issue/${issueKey}?fields=${fields}`);
  }
}

module.exports = JiraClient;