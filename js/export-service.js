import { downloadBlob } from './utils.js';
import { $, round } from './utils.js';

export class ExportService {
  constructor(messageManager, rowManager, dataRepository) {
    this.messageManager = messageManager;
    this.rowManager = rowManager;
    this.dataRepository = dataRepository;
  }

  getGrandTotal() {
    const el = $('#grandTotal');
    return el ? el.value : '0';
  }

  getMaterialInfo() {
    const material = $('#materialSelect')?.selectedOptions?.[0]?.textContent || '';
    const system = $('#systemSelect')?.selectedOptions?.[0]?.textContent || '';
    return { material, system };
  }

  exportCSV() {
    this.messageManager.hideMsg();
    const rows = this.rowManager.collectRows();
    if (!rows.length) {
      this.messageManager.showErr('Нет строк для экспорта.');
      return;
    }

    // Рассчитываем общую сумму из данных
    let grandTotal = 0;
    rows.forEach(r => {
      const val = parseFloat(r['Итого (кг)']);
      if (Number.isFinite(val)) {
        grandTotal += val;
      }
    });
    grandTotal = round(grandTotal, 2);

    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = String(v ?? '');
      // Добавляем пробел перед числами чтобы Excel не интерпретировал как дату
      if (/^\d+[.,]\d+$/.test(s)) {
        return s.replace('.', ','); // Заменяем точку на запятую для Excel
      }
      return /[",\n;]/.test(s) ? ('"' + s.replace(/"/g, '""') + '"') : s;
    };

    const lines = [];
    // Заголовки колонок
    lines.push(headers.map(esc).join(';'));
    // Данные
    rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(';')));
    // Пустая строка и итог
    lines.push('');
    const totalRow = new Array(headers.length).fill('');
    totalRow[headers.length - 2] = 'ОБЩАЯ СУММА (кг)';
    totalRow[headers.length - 1] = String(grandTotal).replace('.', ',');
    lines.push(totalRow.join(';'));
    // Контакты
    lines.push('');
    lines.push('https://prokras.net;+7 (499) 113-22-72;info@prokras.net');

    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const bom = '\ufeff';
    downloadBlob(
      `ptm_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`,
      'text/csv;charset=utf-8',
      bom + lines.join('\r\n')
    );
    this.messageManager.showOk('CSV скачан.');
    setTimeout(() => this.messageManager.hideMsg(), 1200);
  }

  exportXLSX() {
    this.messageManager.hideMsg();
    const rows = this.rowManager.collectRows();
    if (!rows.length) {
      this.messageManager.showErr('Нет строк для экспорта.');
      return;
    }

    const { material, system } = this.getMaterialInfo();
    const grandTotal = this.getGrandTotal();

    // Создаём данные с заголовком
    const data = [];
    data.push(['Расчёт ПТМ и расхода огнезащиты']);
    data.push([`Материал: ${material}${system && system !== '—' ? ' / ' + system : ''}`]);
    data.push([`Дата: ${new Date().toLocaleString('ru-RU')}`]);
    data.push([]);  // Пустая строка

    // Заголовки колонок
    const headers = Object.keys(rows[0]);
    data.push(headers);

    // Данные
    rows.forEach(r => data.push(headers.map(h => r[h])));

    // Пустая строка и итог
    data.push([]);
    const totalRow = new Array(headers.length).fill('');
    totalRow[headers.length - 2] = 'ОБЩАЯ СУММА (кг):';
    totalRow[headers.length - 1] = grandTotal;
    data.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Устанавливаем ширину колонок
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 6 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ПТМ');
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    XLSX.writeFile(wb, `ptm_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.xlsx`);
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

    const { material, system } = this.getMaterialInfo();
    const grandTotal = this.getGrandTotal();

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

    // Заголовок
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 46);
    doc.text('Расчёт ПТМ и расхода огнезащиты', 14, 14);

    // Информация о материале
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Материал: ${material}${system && system !== '—' ? ' / ' + system : ''}`, 14, 22);
    doc.text(`Дата: ${new Date().toLocaleString('ru-RU')}`, 14, 28);

    const head = [[
      'Тип', 'ГОСТ', 'Размер', 'P (см)', 'S (см²)', 'ПТМ (мм)',
      'Огнест.', 'м²/мп', 'м²/тн', 'Толщ.', 'Расх.', 'Кол-во', 'Ед', 'Итого (кг)'
    ]];
    const body = rows.map(r => [
      r['Тип'], r['ГОСТ'], r['Размер'],
      r['Периметр обогреваемой поверхности см'], r['Площадь сечения см²'], r['ПТМ (мм)'],
      r['Предел огнестойкости'], r['Площадь мп/м²'], r['Площадь тн/м²'],
      r['Толщина нанесения'], r['Расход (кг/м²)'], r['Количество'], r['Ед'], r['Итого (кг)']
    ]);

    // Добавляем строку с общей суммой
    body.push([
      { content: 'ИТОГО:', styles: { fontStyle: 'bold', halign: 'right' }, colSpan: 13 },
      { content: grandTotal + ' кг', styles: { fontStyle: 'bold', fillColor: [230, 245, 255], halign: 'right' } }
    ]);

    doc.autoTable({
      head,
      body,
      startY: 34,
      styles: {
        font: (doc.getFont().fontName || 'DejaVuSans'),
        fontSize: 8,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [26, 26, 46],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [248, 248, 252]
      },
      columnStyles: {
        0: { cellWidth: 28 },  // Тип
        1: { cellWidth: 22 },  // ГОСТ
        2: { cellWidth: 32 },  // Размер
        3: { cellWidth: 14, halign: 'right' },  // P
        4: { cellWidth: 14, halign: 'right' },  // S
        5: { cellWidth: 14, halign: 'right' },  // ПТМ
        6: { cellWidth: 14, halign: 'center' }, // Огнест
        7: { cellWidth: 14, halign: 'right' },  // м²/мп
        8: { cellWidth: 14, halign: 'right' },  // м²/тн
        9: { cellWidth: 12, halign: 'right' },  // Толщ
        10: { cellWidth: 14, halign: 'right' }, // Расх
        11: { cellWidth: 14, halign: 'right' }, // Кол-во
        12: { cellWidth: 10, halign: 'center' }, // Ед
        13: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }  // Итого
      },
      theme: 'grid',
      margin: { left: 10, right: 10 }
    });

    // Контакты в подвале с кликабельной ссылкой
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(8);
    doc.setTextColor(70, 130, 180);
    doc.textWithLink('prokras.net', 14, finalY + 8, { url: 'https://prokras.net' });
    doc.setTextColor(120, 120, 120);
    doc.text('  |  +7 (499) 113-22-72  |  ', 14 + doc.getTextWidth('prokras.net'), finalY + 8);
    const emailX = 14 + doc.getTextWidth('prokras.net  |  +7 (499) 113-22-72  |  ');
    doc.setTextColor(70, 130, 180);
    doc.textWithLink('info@prokras.net', emailX, finalY + 8, { url: 'mailto:info@prokras.net' });

    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    doc.save(`ptm_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`);
    this.messageManager.showOk('PDF скачан.');
    setTimeout(() => this.messageManager.hideMsg(), 1200);
  }
}
