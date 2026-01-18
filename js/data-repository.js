import { JSONLoader } from './json-loader.js';

export class DataRepository {
  constructor() {
    this.DB = {};
    this.DEJAVU_TTF_BASE64 = '';
    this.frizolData = null;
    this.sternfireData = null;
    this.loaded = false;
    this.fontLoaded = false;
    this.frizolLoaded = false;
    this.sternfireLoaded = false;
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

  getFireResistanceLimits(material = 'ograx') {
    const limits = new Set();
    
    if (material === 'sternfire' && this.sternfireData && Array.isArray(this.sternfireData)) {
      // Для Sternfire берем все ключи кроме "ПТМ" и "null"
      this.sternfireData.forEach(item => {
        Object.keys(item).forEach(key => {
          if (key !== 'ПТМ' && key !== 'null') {
            limits.add(key);
          }
        });
      });
    } else if (this.frizolData && this.frizolData.data) {
      // Для Frizol/Огракс
      Object.values(this.frizolData.data).forEach(ptmData => {
        Object.keys(ptmData).forEach(limit => limits.add(limit));
      });
    }
    
    // Преобразуем в формат R15, R45 и т.д. если нужно
    const result = Array.from(limits)
      .map(limit => {
        // Если уже в формате R15, оставляем как есть
        if (limit.startsWith('R')) return limit;
        // Если просто число, добавляем R
        if (/^\d+$/.test(limit)) return `R${limit}`;
        // Иначе оставляем как есть (например "90 мин (конструктив)")
        return limit;
      })
      .sort((a, b) => {
        // Сортируем: сначала R15, R45, R60, R90, потом остальные
        const aNum = parseInt(a.replace('R', '')) || 999;
        const bNum = parseInt(b.replace('R', '')) || 999;
        return aNum - bNum;
      });
    
    return result;
  }

  async loadSternfireFromJSON(jsonUrl) {
    if (this.sternfireLoaded) return;
    const sternfireData = await JSONLoader.loadFromFile(jsonUrl);
    if (sternfireData && Array.isArray(sternfireData)) {
      this.sternfireData = sternfireData;
      this.sternfireLoaded = true;
      console.log('Sternfire data loaded');
    } else {
      console.warn('Failed to load Sternfire JSON');
    }
  }

  getThicknessAndConsumption(ptm, fireResistanceLimit, material = 'ograx') {
    if (!ptm || !fireResistanceLimit) {
      console.log('getThicknessAndConsumption: missing ptm or fireResistanceLimit', { ptm, fireResistanceLimit });
      return null;
    }

    const ptmNum = Number(ptm);
    if (!Number.isFinite(ptmNum)) {
      console.log('getThicknessAndConsumption: invalid PTM', ptm);
      return null;
    }

    if (material === 'sternfire') {
      return this.getThicknessFromSternfire(ptmNum, fireResistanceLimit);
    } else {
      return this.getThicknessFromFrizol(ptmNum, fireResistanceLimit);
    }
  }

  getThicknessFromFrizol(ptmNum, fireResistanceLimit) {
    if (!this.frizolData || !this.frizolData.data) {
      console.log('getThicknessFromFrizol: no frizol data');
      return null;
    }

    const limit = fireResistanceLimit.replace('R', '');
    const ptmKeys = Object.keys(this.frizolData.data)
      .map(k => ({ str: k, num: Number(k) }))
      .filter(k => Number.isFinite(k.num))
      .sort((a, b) => b.num - a.num); // Сортируем по убыванию для поиска ближайшего нижнего

    // Ищем ближайшее нижнее значение ПТМ (<= ptmNum)
    let foundPtmStr = null;
    for (const { str, num } of ptmKeys) {
      if (num <= ptmNum) {
        foundPtmStr = str;
        break;
      }
    }

    if (foundPtmStr && this.frizolData.data[foundPtmStr] && this.frizolData.data[foundPtmStr][limit]) {
      const result = this.frizolData.data[foundPtmStr][limit];
      console.log('getThicknessFromFrizol: found', { 
        requested: ptmNum, 
        found: foundPtmStr, 
        limit, 
        result 
      });
      return result;
    }

    console.log('getThicknessFromFrizol: no data found', { ptmNum, limit, foundPtmStr });
    return null;
  }

  getThicknessFromSternfire(ptmNum, fireResistanceLimit) {
    if (!this.sternfireData || !Array.isArray(this.sternfireData)) {
      console.log('getThicknessFromSternfire: no sternfire data');
      return null;
    }

    // Сортируем по ПТМ по убыванию для поиска ближайшего нижнего
    const sortedData = [...this.sternfireData]
      .filter(item => item && typeof item.ПТМ === 'number')
      .sort((a, b) => b.ПТМ - a.ПТМ);

    // Ищем ближайшее нижнее значение ПТМ (<= ptmNum)
    let foundItem = null;
    for (const item of sortedData) {
      if (item.ПТМ <= ptmNum) {
        foundItem = item;
        break;
      }
    }

    if (!foundItem) {
      console.log('getThicknessFromSternfire: no PTM found <=', ptmNum);
      return null;
    }

    // Получаем значение толщины для выбранного предела огнестойкости
    const thickness = foundItem[fireResistanceLimit];
    
    if (thickness === null || thickness === undefined) {
      console.log('getThicknessFromSternfire: no thickness for limit', { 
        ptm: foundItem.ПТМ, 
        limit: fireResistanceLimit 
      });
      return null;
    }

    console.log('getThicknessFromSternfire: found', { 
      requested: ptmNum, 
      found: foundItem.ПТМ, 
      limit: fireResistanceLimit,
      thickness 
    });

    // Для Sternfire возвращаем только толщину (расход не указан в таблице)
    return { thickness: Number(thickness), consumption: null };
  }

  getDejaVuFont() {
    return this.DEJAVU_TTF_BASE64;
  }
}
