export class JSONLoader {
  static async loadFromFile(url) {
    try {
      console.log('Fetching JSON from:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const db = await response.json();
      console.log('JSON loaded successfully, keys:', Object.keys(db || {}));
      return db;
    } catch (error) {
      console.error('Failed to load JSON from', url, ':', error);
      return null;
    }
  }
}
