import { JSONLoader } from './json-loader.js';

export class DataRepository {
  constructor() {
    this.DB = {};
    this.DEJAVU_TTF_BASE64 = '';
    this.materials = null;
    this.loaded = false;
    this.fontLoaded = false;
    this.materialsLoaded = false;
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
    } else {
      console.error('Failed to load JSON or JSON is empty');
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

  async loadMaterialsFromJSON(jsonUrl) {
    if (this.materialsLoaded) return;
    const data = await JSONLoader.loadFromFile(jsonUrl);
    if (data) {
      this.materials = data;
      this.materialsLoaded = true;
      console.log('Materials data loaded:', Object.keys(data));
    } else {
      console.warn('Failed to load materials JSON');
    }
  }

  getTypes() {
    return Object.keys(this.DB);
  }

  getStandardsFor(type) {
    return Object.keys(this.DB[type] || {});
  }

  getItemsFor(type, std) {
    return (this.DB[type] && this.DB[type][std]) ? this.DB[type][std] : [];
  }

  getMaterial(materialId) {
    if (!this.materials) return null;
    return this.materials[materialId] || null;
  }

  getFireResistanceLimits(materialId = 'ograx') {
    const material = this.getMaterial(materialId);
    if (!material || !material.fireResistanceLimits) {
      return [];
    }

    return material.fireResistanceLimits.map(limit => {
      // Конвертируем "15" -> "R15", "90к" -> "90 мин (конструктив)"
      if (limit === '90к') return '90 мин (конструктив)';
      if (limit === '120к') return '120 мин (конструктив)';
      if (/^\d+$/.test(limit)) return `R${limit}`;
      return limit;
    });
  }

  getThicknessAndConsumption(ptm, fireResistanceLimit, materialId = 'ograx') {
    if (!ptm || !fireResistanceLimit) {
      return null;
    }

    const ptmNum = Number(ptm);
    if (!Number.isFinite(ptmNum)) {
      return null;
    }

    const material = this.getMaterial(materialId);
    if (!material || !material.data) {
      return null;
    }

    // Нормализуем предел огнестойкости
    let limit = fireResistanceLimit.replace('R', '');
    if (limit === '90 мин (конструктив)') limit = '90к';
    if (limit === '120 мин (конструктив)') limit = '120к';

    // Получаем все ПТМ ключи отсортированные по убыванию
    const ptmKeys = Object.keys(material.data)
      .map(k => ({ str: k, num: Number(k) }))
      .filter(k => Number.isFinite(k.num))
      .sort((a, b) => b.num - a.num);

    // Ищем ближайшее нижнее значение ПТМ (<= ptmNum)
    let foundPtmStr = null;
    for (const { str, num } of ptmKeys) {
      if (num <= ptmNum) {
        foundPtmStr = str;
        break;
      }
    }

    if (!foundPtmStr) {
      return null;
    }

    const ptmData = material.data[foundPtmStr];
    if (!ptmData || !ptmData[limit]) {
      return null;
    }

    const result = ptmData[limit];

    // Для Фризол возвращаем thickness и consumption
    // Для Sternfire только consumption (thickness = null)
    return {
      thickness: result.thickness ?? null,
      consumption: result.consumption ?? null
    };
  }

  getDejaVuFont() {
    return this.DEJAVU_TTF_BASE64;
  }

  // Legacy методы для обратной совместимости
  async loadFrizolFromJSON(jsonUrl) {
    // Не используется, данные теперь в materials.json
    console.log('loadFrizolFromJSON is deprecated, use loadMaterialsFromJSON');
  }

  async loadSternfireFromJSON(jsonUrl) {
    // Не используется, данные теперь в materials.json
    console.log('loadSternfireFromJSON is deprecated, use loadMaterialsFromJSON');
  }
}
