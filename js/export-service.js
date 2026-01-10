import { downloadBlob } from './utils.js';

export class ExportService {
  constructor(messageManager, rowManager, dataRepository) {
    this.messageManager = messageManager;
    this.rowManager = rowManager;
    this.dataRepository = dataRepository;
  }

  exportCSV() {
    this.messageManager.hideMsg();
    const rows = this.rowManager.collectRows();
    if (!rows.length) {
      this.messageManager.showErr('Нет строк для экспорта.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? ('"' + s.replace(/"/g, '""') + '"') : s;
    };
    const lines = [headers.map(esc).join(';')];
    rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(';')));

    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const bom = '\ufeff';
    downloadBlob(
      `ptm_table_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`,
      'text/csv;charset=utf-8',
      bom + lines.join('\r\n')
    );
    this.messageManager.showOk('CSV скачан (UTF-8 BOM).');
    setTimeout(() => this.messageManager.hideMsg(), 1200);
  }

  exportXLSX() {
    this.messageManager.hideMsg();
    const rows = this.rowManager.collectRows();
    if (!rows.length) {
      this.messageManager.showErr('Нет строк для экспорта.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ПТМ');
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    XLSX.writeFile(wb, `ptm_table_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.xlsx`);
    this.messageManager.showOk('Excel скачан.');
    setTimeout(() => this.messageManager.hideMsg(), 1200);
  }

  exportPDF() {
    this.messageManager.hideMsg();
    const rows = this.rowManager.collectRows();
    if (!rows.length) {
      this.messageManager.showErr('Нет строк для экспорта.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

    try {
      const font = this.dataRepository.getDejaVuFont();
      if (font) {
        doc.addFileToVFS('DejaVuSans.ttf', font);
        doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
        doc.setFont('DejaVuSans', 'normal');
      }
    } catch (e) {}

    doc.setFontSize(14);
    doc.text('Таблица расчёта ПТМ и расхода огнезащиты', 14, 14);
    doc.setFontSize(10);
    doc.text('Дата/время: ' + new Date().toLocaleString('ru-RU'), 14, 20);

    const head = [['Тип', 'ГОСТ', 'Типоразмер', 'Периметр', 'Площадь', 'ПТМ (мм)', 'Предел огнест.', 'Пл/м (м²)', 'Пл/т (м²)', 'Толщ (мм)', 'Расх (кг/м²)', 'Кол-во', 'Ед', 'Итого (кг)']];
    const body = rows.map(r => [r['Тип'], r['ГОСТ'], r['Типоразмер'], r['Периметр'], r['Площадь'], r['ПТМ (мм)'], r['Предел огнестойкости'], r['Площадь/м (м²)'], r['Площадь/т (м²)'], r['Толщина (мм)'], r['Расход (кг/м²)'], r['Количество'], r['Ед'], r['Итого (кг)']]);

    doc.autoTable({
      head, body, startY: 28,
      styles: { font: (doc.getFont().fontName || 'DejaVuSans'), fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [250, 250, 250], textColor: [20, 20, 20] },
      theme: 'grid',
      margin: { left: 10, right: 10 }
    });

    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    doc.save(`ptm_table_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`);
    this.messageManager.showOk('PDF скачан (кириллица).');
    setTimeout(() => this.messageManager.hideMsg(), 1200);
  }
}
