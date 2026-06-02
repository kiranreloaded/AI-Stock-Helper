export interface Transaction {
  id: number;
  date: string;
  stock: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  notes: string;
}

export class UpstashService {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.trim().replace(/\/$/, '');
    this.token = token.trim();
  }

  /**
   * Pings the Upstash database to verify credentials.
   */
  async ping(): Promise<boolean> {
    if (!this.url || !this.token) return false;
    try {
      const res = await fetch(`${this.url}/ping`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetches JSON value from Upstash for a given key.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.url || !this.token) return null;
    const res = await fetch(`${this.url}/get/${key}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (!res.ok) {
      throw new Error(`Upstash error: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(`Upstash Redis Error: ${data.error}`);
    }
    return data.result ? JSON.parse(data.result) as T : null;
  }

  /**
   * Saves a JSON value to Upstash for a given key.
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    if (!this.url || !this.token) return false;
    const res = await fetch(`${this.url}/set/${key}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(JSON.stringify(value))
    });
    if (!res.ok) {
      throw new Error(`Upstash error: ${res.statusText}`);
    }
    return res.ok;
  }
}
