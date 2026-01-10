import { $, MessageManager } from './utils.js';
import { DataRepository } from './data-repository.js';
import { RowManager } from './row-manager.js';
import { ExportService } from './export-service.js';

(async function() {
  const errEl = $('#err'), okEl = $('#ok');
  const messageManager = new MessageManager(errEl, okEl);
  const dataRepository = new DataRepository();
  
  try {
    await Promise.all([
      dataRepository.loadFromJSON('data/profiles.json'),
      dataRepository.loadFontFromJSON('data/font.json'),
      dataRepository.loadFrizolFromJSON('data/frizol_data.json')
    ]);
    
    const types = dataRepository.getTypes();
    console.log('Data repository after load - types:', types);
    console.log('DB keys:', Object.keys(dataRepository.DB));
    
    if (types.length === 0) {
      console.error('No types loaded! DB is empty.');
      messageManager.showErr('Ошибка: данные не загружены. Проверьте консоль.');
      return;
    }
    
    const firstType = types[0];
    if (firstType) {
      const standards = dataRepository.getStandardsFor(firstType);
      console.log('Standards for', firstType, ':', standards);
      if (standards.length === 0) {
        console.error('No standards found for type:', firstType);
      }
    }
  } catch (error) {
    console.error('Error loading JSON:', error);
    messageManager.showErr('Ошибка загрузки данных: ' + error.message);
  }
  
  const tbody = $('#tbody');
  const rowManager = new RowManager(dataRepository, messageManager, tbody);
  const exportService = new ExportService(messageManager, rowManager, dataRepository);

  $('#btnAdd').addEventListener('click', () => rowManager.addRow());
  $('#btnCsv').addEventListener('click', () => exportService.exportCSV());
  $('#btnPdf').addEventListener('click', () => exportService.exportPDF());
  $('#btnClear').addEventListener('click', () => rowManager.clearAll());

  if (!rowManager.loadFromLocalStorage()) {
    rowManager.addRow();
  }
})();
