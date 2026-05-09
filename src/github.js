const https = require('https');

class GitHubClient {
  constructor(token) {
    this.token = token;
  }

  _request(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Flowzy-VSCode',
        },
      };
      https.get(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const p = JSON.parse(data);
            if (p.message) reject(new Error(p.message));
            else resolve(p);
          } catch (e) { reject(new Error('Invalid response from GitHub')); }
        });
      }).on('error', reject);
    });
  }

  async getIssue(owner, repo, issueNumber) {
    return this._request(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  }
}

module.exports = GitHubClient;