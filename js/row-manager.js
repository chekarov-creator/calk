import { $, $$, round, MessageManager } from './utils.js';
import { makeSelect, makeInput } from './ui-components.js';
import { HeatControl } from './heat-control.js';
import { CalculationService } from './calculation-service.js';

export class RowManager {
  constructor(dataRepository, messageManager, tbody) {
    this.dataRepository = dataRepository;
    this.messageManager = messageManager;
    this.tbody = tbody;
    this.STORAGE_KEY = 'ptm_calculator_rows';
  }

  saveToLocalStorage() {
    const rows = [];
    $$('#tbody tr').forEach(tr => {
      const type = tr.querySelector('td:nth-child(1) select')?.value || '';
      const std = tr.querySelector('td:nth-child(2) select')?.value || '';
      const search = tr.querySelector('td:nth-child(3) input')?.value || '';
      const sizeIndex = tr.querySelector('td:nth-child(3) select')?.value || '';
      const heatBox = tr.querySelector('.heatbox');
      let heatState = null;
      if (heatBox) {
        const heatCtrlEl = heatBox.querySelector('.svgwrap');
        if (heatCtrlEl && heatCtrlEl._heatControl) {
          const state = heatCtrlEl._heatControl.getState();
          heatState = {
            mode: state.mode,
            rectMask: state.rectMask,
            circleFraction: state.circleFraction,
            polyMask: state.polyMask,
            polyType: state.polyType
          };
        }
      }
      const pInp = tr.querySelector('td:nth-child(4) input[type="number"]')?.value || '';
      const fireRes = tr.querySelector('td:nth-child(8) select')?.value || '';
      const thInp = tr.querySelector('td:nth-child(11) input')?.value || '';
      const qtyInp = tr.querySelector('td:nth-child(13) input')?.value || '';
      const qtyUnit = tr.querySelector('td:nth-child(13) select')?.value || '';
      
      rows.push({
        type, std, search, sizeIndex, pInp, fireRes, thInp, qtyInp, qtyUnit,
        heatState
      });
    });
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return false;
      const rows = JSON.parse(saved);
      if (!Array.isArray(rows) || rows.length === 0) return false;
      
      this.tbody.innerHTML = '';
      rows.forEach(rowData => {
        this.addRowFromData(rowData);
      });
      return true;
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      return false;
    }
  }

  addRow(rowData = null) {
    this.messageManager.hideMsg();
    const tr = document.createElement('tr');

    const tdType = document.createElement('td');
    const types = this.dataRepository.getTypes();
    console.log('Available types:', types);
    const defaultType = types.includes('Профиль (кв/прям)') ? 'Профиль (кв/прям)' : (types[0] || '');
    const typeSel = makeSelect(types.map(t => ({ value: t, label: t })), defaultType);
    console.log('Selected default type:', defaultType);
    tdType.appendChild(typeSel);
    tr.appendChild(tdType);

    const tdStd = document.createElement('td');
    const stdSel = makeSelect([], '');
    tdStd.appendChild(stdSel);
    tr.appendChild(tdStd);

    const tdSize = document.createElement('td');
    const sizeCell = document.createElement('div');
    sizeCell.className = 'cell';
    const search = makeInput('', false);
    search.placeholder = 'Поиск… (например 200×100, 20Б1, 10П, 63×40×5)';
    const sizeSel = makeSelect([], '');
    sizeCell.appendChild(search);
    sizeCell.appendChild(sizeSel);
    tdSize.appendChild(sizeCell);
    tr.appendChild(tdSize);

    const tdHeat = document.createElement('td');
    const heatBox = document.createElement('div');
    heatBox.className = 'heatbox';
    const heatCtrl = new HeatControl();
    heatBox.appendChild(heatCtrl.el);

    const right = document.createElement('div');
    right.className = 'cell';
    const pInp = makeInput('', false, 'number');
    pInp.step = '0.01';
    pInp.min = '0';
    pInp.placeholder = 'P (см) — можно вручную';
    right.appendChild(pInp);
    heatBox.appendChild(right);
    tdHeat.appendChild(heatBox);
    tr.appendChild(tdHeat);

    const tdS = document.createElement('td');
    const outS = makeInput('—', true);
    tdS.appendChild(outS);
    tr.appendChild(tdS);

    const tdP = document.createElement('td');
    const outP = makeInput('—', true);
    tdP.appendChild(outP);
    tr.appendChild(tdP);

    const tdX = document.createElement('td');
    const outX = makeInput('—', true);
    tdX.appendChild(outX);
    tr.appendChild(tdX);

    const tdFireRes = document.createElement('td');
    const fireResLimits = this.dataRepository.getFireResistanceLimits();
    const fireResOptions = [
      { value: '', label: '—' },
      ...fireResLimits.map(limit => ({
        value: `R${limit}`,
        label: `R${limit}`
      }))
    ];
    const fireResSel = makeSelect(fireResOptions, '');
    tdFireRes.appendChild(fireResSel);
    tr.appendChild(tdFireRes);

    const tdApm = document.createElement('td');
    const outApm = makeInput('—', true);
    tdApm.appendChild(outApm);
    tr.appendChild(tdApm);

    const tdApt = document.createElement('td');
    const outApt = makeInput('—', true);
    tdApt.appendChild(outApt);
    tr.appendChild(tdApt);

    const tdTh = document.createElement('td');
    const thInp = makeInput($('#defaultThickness').value || '1', false, 'number');
    thInp.step = '0.01';
    thInp.min = '0';
    tdTh.appendChild(thInp);
    tr.appendChild(tdTh);

    const tdCons = document.createElement('td');
    const outCons = makeInput('—', true);
    tdCons.appendChild(outCons);
    tr.appendChild(tdCons);

    const tdQty = document.createElement('td');
    const qtyCell = document.createElement('div');
    qtyCell.className = 'cell';
    const qtyInp = makeInput('1', false, 'number');
    qtyInp.step = '0.01';
    qtyInp.min = '0';
    const qtyUnit = makeSelect([{ value: 'm', label: 'м' }, { value: 't', label: 'т' }], $('#defaultQtyUnit').value || 'm');
    qtyCell.appendChild(qtyInp);
    qtyCell.appendChild(qtyUnit);
    tdQty.appendChild(qtyCell);
    tr.appendChild(tdQty);

    const tdTot = document.createElement('td');
    const outTot = makeInput('—', true);
    tdTot.appendChild(outTot);
    tr.appendChild(tdTot);

    const tdAct = document.createElement('td');
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'btn danger small';
    btnDel.textContent = '×';
    btnDel.title = 'Удалить строку';
    tdAct.appendChild(btnDel);
    tr.appendChild(tdAct);

    const refillStandards = () => {
      const type = typeSel.value;
      console.log('refillStandards called for type:', type);
      const stds = this.dataRepository.getStandardsFor(type);
      console.log('Standards found:', stds);
      stdSel.innerHTML = '';
      stds.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        stdSel.appendChild(opt);
      });
      if (stds.length > 0) {
        stdSel.value = stds[0];
        console.log('Set default standard:', stds[0]);
      }
    };

    const refillSizes = () => {
      const items = this.dataRepository.getItemsFor(typeSel.value, stdSel.value);
      const q = (search.value || '').trim().toLowerCase();
      const filtered = q ? items.filter(it => (it.name || '').toLowerCase().includes(q)) : items;
      sizeSel.innerHTML = '';
      filtered.forEach((it, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = it.name;
        sizeSel.appendChild(opt);
      });
      sizeSel._list = filtered;
      sizeSel.value = '0';
    };

    const currentItem = () => {
      const list = sizeSel._list || [];
      const idx = Number(sizeSel.value || 0);
      return list[Math.max(0, Math.min(idx, list.length - 1))];
    };

    const setHeatMode = (it) => {
      if (!it) return;
      if (it.kind === 'rhs' || it.kind === 'plate') heatCtrl.setMode('rect');
      else if (it.kind === 'pipe' || it.kind === 'round') heatCtrl.setMode('circle');
      else if (it.kind === 'i') heatCtrl.setMode('poly', 12, 'i');
      else if (it.kind === 'u') heatCtrl.setMode('poly', 8, 'u');
      else if (it.kind === 'l') heatCtrl.setMode('poly', 6, 'l');
      else heatCtrl.setMode('manual');
    };

    const recalc = () => {
      this.messageManager.hideMsg();
      const it = currentItem();
      if (!it) {
        outS.value = outP.value = outX.value = outApm.value = outApt.value = outCons.value = outTot.value = '—';
        fireResSel.value = '';
        return;
      }
      setHeatMode(it);

      const st = heatCtrl.getState();
      const g = CalculationService.geom(it, st.rectMask, st.circleFraction, st.polyMask);

      const pManual = Number(String(pInp.value).replace(',', '.'));
      let P_cm = g.P_cm;
      if (Number.isFinite(pManual) && pManual > 0) P_cm = pManual;
      else pInp.value = String(round(P_cm, 2));

      const X = CalculationService.ptm(g.S_cm2, P_cm);

      outS.value = Number.isFinite(g.S_cm2) ? String(round(g.S_cm2, 2)) : '—';
      outP.value = Number.isFinite(P_cm) ? String(round(P_cm, 2)) : '—';
      outX.value = Number.isFinite(X) ? String(round(X, 2)) : '—';

      const areaPerM = P_cm * 0.01;
      const mkg = CalculationService.massKgM(it, g.S_cm2);
      const mPerT = (mkg > 0) ? (1000 / mkg) : NaN;
      const areaPerT = Number.isFinite(mPerT) ? (areaPerM * mPerT) : NaN;

      outApm.value = Number.isFinite(areaPerM) ? String(round(areaPerM, 4)) : '—';
      outApt.value = Number.isFinite(areaPerT) ? String(round(areaPerT, 2)) : '—';

      const fireResValue = fireResSel.value;
      let th, consM2;
      
      if (fireResValue && Number.isFinite(X)) {
        const frizolData = this.dataRepository.getThicknessAndConsumption(X, fireResValue);
        if (frizolData) {
          th = frizolData.thickness;
          thInp.value = String(round(th, 2));
          consM2 = frizolData.consumption;
          outCons.value = Number.isFinite(consM2) ? String(round(consM2, 3)) : '—';
        } else {
          const rate = Number($('#ratePerMm').value);
          th = Number(String(thInp.value).replace(',', '.'));
          consM2 = (Number.isFinite(rate) && rate >= 0 && Number.isFinite(th) && th >= 0) ? (rate * th) : NaN;
          outCons.value = Number.isFinite(consM2) ? String(round(consM2, 3)) : '—';
        }
      } else {
        const rate = Number($('#ratePerMm').value);
        th = Number(String(thInp.value).replace(',', '.'));
        consM2 = (Number.isFinite(rate) && rate >= 0 && Number.isFinite(th) && th >= 0) ? (rate * th) : NaN;
        outCons.value = Number.isFinite(consM2) ? String(round(consM2, 3)) : '—';
      }
      
      if (!Number.isFinite(consM2)) {
        consM2 = Number(String(outCons.value).replace(',', '.'));
      }

      const qty = Number(String(qtyInp.value).replace(',', '.'));
      const unit = qtyUnit.value;
      let totalKg = NaN;
      if (Number.isFinite(consM2) && qty > 0) {
        if (unit === 'm' && Number.isFinite(areaPerM)) totalKg = consM2 * areaPerM * qty;
        if (unit === 't' && Number.isFinite(areaPerT)) totalKg = consM2 * areaPerT * qty;
      }
      outTot.value = Number.isFinite(totalKg) ? String(round(totalKg, 2)) : '—';
    };

    const saveData = () => {
      setTimeout(() => this.saveToLocalStorage(), 100);
    };

    heatCtrl.el._heatControl = heatCtrl;

    typeSel.addEventListener('change', () => { 
      console.log('Type changed to:', typeSel.value);
      refillStandards(); 
      refillSizes(); 
      pInp.value = ''; 
      recalc();
      saveData();
    });
    stdSel.addEventListener('change', () => { refillSizes(); pInp.value = ''; recalc(); saveData(); });
    search.addEventListener('input', () => { refillSizes(); recalc(); saveData(); });
    sizeSel.addEventListener('change', () => { pInp.value = ''; recalc(); saveData(); });
    pInp.addEventListener('input', () => { recalc(); saveData(); });
    thInp.addEventListener('input', () => { recalc(); saveData(); });
    qtyInp.addEventListener('input', () => { recalc(); saveData(); });
    qtyUnit.addEventListener('change', () => { recalc(); saveData(); });
    fireResSel.addEventListener('change', () => { recalc(); saveData(); });
    $('#ratePerMm').addEventListener('input', () => { this.recalcAll(); saveData(); });
    heatCtrl.el.addEventListener('change', () => { pInp.value = ''; recalc(); saveData(); });

    btnDel.addEventListener('click', () => {
      tr.remove();
      if (!this.tbody.children.length) this.addRow();
      saveData();
    });

    if (rowData) {
      typeSel.value = rowData.type || '';
      refillStandards();
      if (rowData.std) stdSel.value = rowData.std;
      if (rowData.search) search.value = rowData.search;
      refillSizes();
      if (rowData.sizeIndex !== undefined && rowData.sizeIndex !== '') sizeSel.value = rowData.sizeIndex;
      if (rowData.pInp) pInp.value = rowData.pInp;
      if (rowData.fireRes) fireResSel.value = rowData.fireRes;
      if (rowData.thInp) thInp.value = rowData.thInp;
      if (rowData.qtyInp) qtyInp.value = rowData.qtyInp;
      if (rowData.qtyUnit) qtyUnit.value = rowData.qtyUnit;
      if (rowData.heatState) {
        const state = rowData.heatState;
        if (state.rectMask !== undefined) {
          heatCtrl.rectMask = state.rectMask;
          heatCtrl.setMode('rect');
        } else if (state.circleFraction !== undefined) {
          const segs = Math.round(state.circleFraction * 12);
          heatCtrl.circleMask = (1 << segs) - 1;
          heatCtrl.setMode('circle');
        } else if (state.polyMask !== undefined) {
          const it = currentItem();
          heatCtrl.polyMask = state.polyMask;
          if (it?.kind === 'i') heatCtrl.setMode('poly', state.polyMask, 'i');
          else if (it?.kind === 'u') heatCtrl.setMode('poly', state.polyMask, 'u');
          else if (it?.kind === 'l') heatCtrl.setMode('poly', state.polyMask, 'l');
        }
      }
      recalc();
    } else {
      console.log('Calling refillStandards() with typeSel.value:', typeSel.value);
      refillStandards();
      refillSizes();
      recalc();
    }
    this.tbody.appendChild(tr);
  }

  addRowFromData(rowData) {
    this.addRow(rowData);
  }

  recalcAll() {
    this.messageManager.hideMsg();
    $$('#tbody tr').forEach(tr => {
      const th = tr.querySelector('td:nth-child(10) input');
      if (th) th.dispatchEvent(new Event('input'));
    });
    this.messageManager.showOk('Пересчитано.');
    setTimeout(() => this.messageManager.hideMsg(), 1200);
  }

  clearAll() {
    this.messageManager.hideMsg();
    this.tbody.innerHTML = '';
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    this.addRow();
  }

  collectRows() {
    this.recalcAll();
    const rows = [];
    $$('#tbody tr').forEach(tr => {
      const type = tr.querySelector('td:nth-child(1) select')?.value || '';
      const std = tr.querySelector('td:nth-child(2) select')?.value || '';
      const name = tr.querySelector('td:nth-child(3) select')?.selectedOptions?.[0]?.textContent || '';
      const P_in = tr.querySelector('td:nth-child(4) input')?.value || '';
      const S = tr.querySelector('td:nth-child(5) input')?.value || '';
      const P = tr.querySelector('td:nth-child(6) input')?.value || '';
      const X = tr.querySelector('td:nth-child(7) input')?.value || '';
      const fireRes = tr.querySelector('td:nth-child(8) select')?.value || '';
      const A1 = tr.querySelector('td:nth-child(9) input')?.value || '';
      const At = tr.querySelector('td:nth-child(10) input')?.value || '';
      const th = tr.querySelector('td:nth-child(11) input')?.value || '';
      const c2 = tr.querySelector('td:nth-child(12) input')?.value || '';
      const qty = tr.querySelector('td:nth-child(13) input')?.value || '';
      const unit = tr.querySelector('td:nth-child(13) select')?.value || '';
      const tot = tr.querySelector('td:nth-child(14) input')?.value || '';
      if (S && S !== '—') {
        rows.push({
          'Тип': type, 'ГОСТ': std, 'Типоразмер': name, 'P (ввод)': P_in,
          'S (см²)': S, 'P (см)': P, 'ПТМ (мм)': X, 'Предел огнестойкости': fireRes, 'Площадь/м (м²)': A1,
          'Площадь/т (м²)': At, 'Толщина (мм)': th, 'Расход (кг/м²)': c2,
          'Количество': qty, 'Ед': unit, 'Итого (кг)': tot
        });
      }
    });
    return rows;
  }
}
