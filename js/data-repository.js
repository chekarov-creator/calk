import { JSONLoader } from './json-loader.js';

export class DataRepository {
  constructor() {
    this.DB = {};
    this.DEJAVU_TTF_BASE64 = '';
    this.frizolData = null;
    this.loaded = false;
    this.fontLoaded = false;
    this.frizolLoaded = false;
  }

  async loadFromJSON(jsonUrl) {
    if (this.loaded) {
      console.log('Data already loaded, skipping');
      return;
    }
    console.log('Loading JSON from:', jsonUrl);
    const jsonDB = await JSONLoader.loadFromFile(jsonUrl);
    if (jsonDB && Object.keys(jsonDB).length > 0) {
      this.DB = jsonDB;
      this.loaded = true;
      console.log('JSON data loaded successfully:', Object.keys(jsonDB).length, 'types');
      console.log('Types:', Object.keys(jsonDB));
      const firstType = Object.keys(jsonDB)[0];
      if (firstType) {
        const standards = Object.keys(jsonDB[firstType]);
        console.log(`First type "${firstType}" has standards:`, standards);
      }
    } else {
      console.error('Failed to load JSON or JSON is empty. jsonDB:', jsonDB);
    }
  }

  async loadFontFromJSON(jsonUrl) {
    if (this.fontLoaded) return;
    const fontData = await JSONLoader.loadFromFile(jsonUrl);
    if (fontData && fontData.DEJAVU_TTF_BASE64) {
      this.DEJAVU_TTF_BASE64 = fontData.DEJAVU_TTF_BASE64;
      this.fontLoaded = true;
      console.log('Font data loaded');
    } else {
      console.warn('Failed to load font JSON');
    }
  }

  getTypes() {
    return Object.keys(this.DB);
  }

  getStandardsFor(type) {
    const standards = Object.keys(this.DB[type] || {});
    console.log(`getStandardsFor("${type}") returned:`, standards);
    return standards;
  }

  getItemsFor(type, std) {
    return (this.DB[type] && this.DB[type][std]) ? this.DB[type][std] : [];
  }

  async loadFrizolFromJSON(jsonUrl) {
    if (this.frizolLoaded) return;
    const frizolData = await JSONLoader.loadFromFile(jsonUrl);
    if (frizolData && frizolData.data) {
      this.frizolData = frizolData;
      this.frizolLoaded = true;
      console.log('Frizol data loaded');
    } else {
      console.warn('Failed to load frizol JSON');
    }
  }

  getFireResistanceLimits() {
    if (!this.frizolData || !this.frizolData.data) return [];
    const limits = new Set();
    Object.values(this.frizolData.data).forEach(ptmData => {
      Object.keys(ptmData).forEach(limit => limits.add(limit));
    });
    return Array.from(limits).sort((a, b) => Number(a) - Number(b));
  }

  getThicknessAndConsumption(ptm, fireResistanceLimit) {
    if (!this.frizolData || !this.frizolData.data || !ptm || !fireResistanceLimit) {
      console.log('getThicknessAndConsumption: missing data', { ptm, fireResistanceLimit, hasFrizolData: !!this.frizolData });
      return null;
    }

    const limit = fireResistanceLimit.replace('R', '');
    const ptmNum = Number(ptm);
    
    if (!Number.isFinite(ptmNum)) {
      console.log('getThicknessAndConsumption: invalid PTM', ptm);
      return null;
    }

    const ptmStr = String(ptmNum);
    
    if (this.frizolData.data[ptmStr] && this.frizolData.data[ptmStr][limit]) {
      console.log('getThicknessAndConsumption: exact match', { ptm: ptmStr, limit, data: this.frizolData.data[ptmStr][limit] });
      return this.frizolData.data[ptmStr][limit];
    }

    const ptmKeys = Object.keys(this.frizolData.data).map(k => ({ str: k, num: Number(k) })).sort((a, b) => a.num - b.num);
    
    let closestPtmStr = null;
    let minDiff = Infinity;
    for (const { str, num } of ptmKeys) {
      const diff = Math.abs(num - ptmNum);
      if (diff < minDiff) {
        minDiff = diff;
        closestPtmStr = str;
      }
    }

    console.log('getThicknessAndConsumption: closest match', { 
      requested: ptmNum, 
      closest: closestPtmStr, 
      diff: minDiff,
      limit,
      hasData: !!(closestPtmStr && this.frizolData.data[closestPtmStr] && this.frizolData.data[closestPtmStr][limit])
    });

    if (closestPtmStr && this.frizolData.data[closestPtmStr] && this.frizolData.data[closestPtmStr][limit]) {
      console.log('getThicknessAndConsumption: returning', this.frizolData.data[closestPtmStr][limit]);
      return this.frizolData.data[closestPtmStr][limit];
    }

    console.log('getThicknessAndConsumption: no data found');
    return null;
  }

  getDejaVuFont() {
    return this.DEJAVU_TTF_BASE64;
  }
}
