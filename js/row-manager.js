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
      const profileCell = tr.querySelector('td:nth-child(1) .params-column');
      const type = profileCell?.querySelectorAll('select')[0]?.value || '';
      const std = profileCell?.querySelectorAll('select')[1]?.value || '';
      const search = profileCell?.querySelector('input')?.value || '';
      const sizeIndex = profileCell?.querySelectorAll('select')[2]?.value || '';
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
      const paramsCell = tr.querySelector('td:nth-child(3) .params-column');
      const pInp = paramsCell?.querySelector('input[type="number"]')?.value || '';
      const calculationsCell = tr.querySelector('td:nth-child(4) .params-column');
      const fireRes = calculationsCell?.querySelector('select')?.value || '';
      const thInp = calculationsCell?.querySelector('input[type="number"]')?.value || '';
      const resultsCell = tr.querySelector('td:nth-child(5) .params-column');
      const qtyInp = resultsCell?.querySelector('input[type="number"]')?.value || '';
      const qtyUnit = resultsCell?.querySelector('select')?.value || '';
      
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

    const tdProfile = document.createElement('td');
    const profileCell = document.createElement('div');
    profileCell.className = 'params-column';
    
    const types = this.dataRepository.getTypes();
    console.log('Available types:', types);
    const defaultType = types.includes('Профиль (кв/прям)') ? 'Профиль (кв/прям)' : (types[0] || '');
    const typeSel = makeSelect(types.map(t => ({ value: t, label: t })), defaultType);
    console.log('Selected default type:', defaultType);
    const typeLabel = document.createElement('label');
    typeLabel.className = 'param-label';
    typeLabel.textContent = 'Тип';
    const typeWrapper = document.createElement('div');
    typeWrapper.className = 'param-group';
    typeWrapper.appendChild(typeLabel);
    typeWrapper.appendChild(typeSel);
    profileCell.appendChild(typeWrapper);

    const stdSel = makeSelect([], '');
    const stdLabel = document.createElement('label');
    stdLabel.className = 'param-label';
    stdLabel.textContent = 'ГОСТ';
    const stdWrapper = document.createElement('div');
    stdWrapper.className = 'param-group';
    stdWrapper.appendChild(stdLabel);
    stdWrapper.appendChild(stdSel);
    profileCell.appendChild(stdWrapper);

    const sizeCell = document.createElement('div');
    sizeCell.className = 'cell';
    const search = makeInput('', false);
    search.placeholder = 'Поиск… (например 200×100, 20Б1, 10П, 63×40×5)';
    const sizeSel = makeSelect([], '');
    sizeCell.appendChild(search);
    sizeCell.appendChild(sizeSel);
    const sizeLabel = document.createElement('label');
    sizeLabel.className = 'param-label';
    sizeLabel.textContent = 'Размер';
    const sizeWrapper = document.createElement('div');
    sizeWrapper.className = 'param-group';
    sizeWrapper.appendChild(sizeLabel);
    sizeWrapper.appendChild(sizeCell);
    profileCell.appendChild(sizeWrapper);

    tdProfile.appendChild(profileCell);
    tr.appendChild(tdProfile);

    const tdHeat = document.createElement('td');
    const heatBox = document.createElement('div');
    heatBox.className = 'heatbox';
    const heatCtrl = new HeatControl();
    heatBox.appendChild(heatCtrl.el);
    tdHeat.appendChild(heatBox);
    tr.appendChild(tdHeat);

    const tdParams = document.createElement('td');
    const paramsCell = document.createElement('div');
    paramsCell.className = 'params-column';
    
    const pInp = makeInput('', false, 'number');
    pInp.step = '0.01';
    pInp.min = '0';
    pInp.placeholder = 'Периметр — можно вручную';
    const pLabel = document.createElement('label');
    pLabel.className = 'param-label';
    pLabel.textContent = 'Периметр обогреваемой поверхности см';
    const pWrapper = document.createElement('div');
    pWrapper.className = 'param-group';
    pWrapper.appendChild(pLabel);
    pWrapper.appendChild(pInp);
    paramsCell.appendChild(pWrapper);

    const outS = makeInput('—', true);
    const sLabel = document.createElement('label');
    sLabel.className = 'param-label';
    sLabel.textContent = 'Площадь сечения см²';
    const sWrapper = document.createElement('div');
    sWrapper.className = 'param-group';
    sWrapper.appendChild(sLabel);
    sWrapper.appendChild(outS);
    paramsCell.appendChild(sWrapper);

    const outX = makeInput('—', true);
    const xLabel = document.createElement('label');
    xLabel.className = 'param-label';
    xLabel.textContent = 'ПТМ (мм)';
    const xWrapper = document.createElement('div');
    xWrapper.className = 'param-group';
    xWrapper.appendChild(xLabel);
    xWrapper.appendChild(outX);
    paramsCell.appendChild(xWrapper);

    tdParams.appendChild(paramsCell);
    tr.appendChild(tdParams);

    const tdCalculations = document.createElement('td');
    const calculationsCell = document.createElement('div');
    calculationsCell.className = 'params-column';
    
    const getMaterial = () => $('#materialSelect')?.value || 'ograx';
    
    const updateFireResistanceOptions = () => {
      const material = getMaterial();
      const fireResLimits = this.dataRepository.getFireResistanceLimits(material);
      const currentValue = fireResSel.value;
      fireResSel.innerHTML = '';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '—';
      fireResSel.appendChild(emptyOpt);
      fireResLimits.forEach(limit => {
        const opt = document.createElement('option');
        opt.value = limit.startsWith('R') ? limit : `R${limit}`;
        opt.textContent = limit.startsWith('R') ? limit : `R${limit}`;
        fireResSel.appendChild(opt);
      });
      // Восстанавливаем значение, если оно есть в новом списке
      if (currentValue && Array.from(fireResSel.options).some(opt => opt.value === currentValue)) {
        fireResSel.value = currentValue;
      } else {
        fireResSel.value = '';
      }
    };
    
    // Сохраняем функцию для внешнего доступа
    fireResSel._updateOptions = updateFireResistanceOptions;
    
    const fireResSel = makeSelect([], '');
    const fireResLabel = document.createElement('label');
    fireResLabel.className = 'param-label';
    fireResLabel.textContent = 'Предел огнестойкости';
    const fireResWrapper = document.createElement('div');
    fireResWrapper.className = 'param-group';
    fireResWrapper.appendChild(fireResLabel);
    fireResWrapper.appendChild(fireResSel);
    calculationsCell.appendChild(fireResWrapper);
    
    updateFireResistanceOptions();
    
    const outApm = makeInput('—', true);
    const apmLabel = document.createElement('label');
    apmLabel.className = 'param-label';
    apmLabel.textContent = 'Площадь мп/м²';
    const apmWrapper = document.createElement('div');
    apmWrapper.className = 'param-group';
    apmWrapper.appendChild(apmLabel);
    apmWrapper.appendChild(outApm);
    calculationsCell.appendChild(apmWrapper);

    const outApt = makeInput('—', true);
    const aptLabel = document.createElement('label');
    aptLabel.className = 'param-label';
    aptLabel.textContent = 'Площадь тн/м²';
    const aptWrapper = document.createElement('div');
    aptWrapper.className = 'param-group';
    aptWrapper.appendChild(aptLabel);
    aptWrapper.appendChild(outApt);
    calculationsCell.appendChild(aptWrapper);

    const thInp = makeInput($('#defaultThickness').value || '1', false, 'number');
    thInp.step = '0.01';
    thInp.min = '0';
    const thLabel = document.createElement('label');
    thLabel.className = 'param-label';
    thLabel.textContent = 'Толщина нанесения';
    const thWrapper = document.createElement('div');
    thWrapper.className = 'param-group';
    thWrapper.appendChild(thLabel);
    thWrapper.appendChild(thInp);
    calculationsCell.appendChild(thWrapper);

    tdCalculations.appendChild(calculationsCell);
    tr.appendChild(tdCalculations);

    const tdResults = document.createElement('td');
    const resultsCell = document.createElement('div');
    resultsCell.className = 'params-column';
    
    const outCons = makeInput('—', true);
    const consLabel = document.createElement('label');
    consLabel.className = 'param-label';
    consLabel.textContent = 'Расход (кг/м²)';
    const consWrapper = document.createElement('div');
    consWrapper.className = 'param-group';
    consWrapper.appendChild(consLabel);
    consWrapper.appendChild(outCons);
    resultsCell.appendChild(consWrapper);

    const qtyCell = document.createElement('div');
    qtyCell.className = 'cell';
    const qtyInp = makeInput('1', false, 'number');
    qtyInp.step = '0.01';
    qtyInp.min = '0';
    const qtyUnit = makeSelect([{ value: 'm', label: 'м²' }, { value: 't', label: 'тн' }], $('#defaultQtyUnit').value || 'm');
    qtyCell.appendChild(qtyInp);
    qtyCell.appendChild(qtyUnit);
    const qtyLabel = document.createElement('label');
    qtyLabel.className = 'param-label';
    qtyLabel.textContent = 'Количество';
    const qtyWrapper = document.createElement('div');
    qtyWrapper.className = 'param-group';
    qtyWrapper.appendChild(qtyLabel);
    qtyWrapper.appendChild(qtyCell);
    resultsCell.appendChild(qtyWrapper);

    const outTot = makeInput('—', true);
    const totLabel = document.createElement('label');
    totLabel.className = 'param-label';
    totLabel.textContent = 'Итого (кг)';
    const totWrapper = document.createElement('div');
    totWrapper.className = 'param-group';
    totWrapper.appendChild(totLabel);
    totWrapper.appendChild(outTot);
    resultsCell.appendChild(totWrapper);

    tdResults.appendChild(resultsCell);
    tr.appendChild(tdResults);

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
        outS.value = outX.value = outApm.value = outApt.value = outCons.value = outTot.value = '—';
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
        const material = getMaterial();
        const materialData = this.dataRepository.getThicknessAndConsumption(X, fireResValue, material);
        if (materialData) {
          th = materialData.thickness;
          thInp.value = String(round(th, 2));
          consM2 = materialData.consumption;
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
    $('#materialSelect')?.addEventListener('change', () => { 
      updateFireResistanceOptions(); 
      recalc(); 
      saveData(); 
    });
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
      const calculationsCell = tr.querySelector('td:nth-child(4) .params-column');
      const th = calculationsCell?.querySelector('input[type="number"]');
      if (th) th.dispatchEvent(new Event('input'));
    });
    this.messageManager.showOk('Пересчитано.');
    setTimeout(() => this.messageManager.hideMsg(), 1200);
  }

  updateAllRowsForMaterial() {
    $$('#tbody tr').forEach(tr => {
      const fireResSel = tr.querySelector('td:nth-child(4) .param-group:nth-child(1) select');
      if (fireResSel && fireResSel._updateOptions) {
        fireResSel._updateOptions();
        fireResSel.dispatchEvent(new Event('change'));
      }
    });
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
      const profileCell = tr.querySelector('td:nth-child(1) .params-column');
      const type = profileCell?.querySelectorAll('select')[0]?.value || '';
      const std = profileCell?.querySelectorAll('select')[1]?.value || '';
      const name = profileCell?.querySelectorAll('select')[2]?.selectedOptions?.[0]?.textContent || '';
      const paramsCell = tr.querySelector('td:nth-child(3) .params-column');
      const P_in = paramsCell?.querySelector('input[type="number"]')?.value || '';
      const readonlyInputs = paramsCell?.querySelectorAll('input[readonly]') || [];
      const S = readonlyInputs[0]?.value || '';
      const X = readonlyInputs[1]?.value || '';
      const calculationsCell = tr.querySelector('td:nth-child(4) .params-column');
      const fireRes = calculationsCell?.querySelector('select')?.value || '';
      const calculationsInputs = calculationsCell?.querySelectorAll('input[readonly]') || [];
      const A1 = calculationsInputs[0]?.value || '';
      const At = calculationsInputs[1]?.value || '';
      const th = calculationsCell?.querySelector('input[type="number"]')?.value || '';
      const resultsCell = tr.querySelector('td:nth-child(5) .params-column');
      const resultsInputs = resultsCell?.querySelectorAll('input[readonly]') || [];
      const c2 = resultsInputs[0]?.value || '';
      const qty = resultsCell?.querySelector('input[type="number"]')?.value || '';
      const unit = resultsCell?.querySelector('select')?.value || '';
      const tot = resultsInputs[1]?.value || '';
      if (S && S !== '—') {
        rows.push({
          'Тип': type, 'ГОСТ': std, 'Размер': name, 'Периметр обогреваемой поверхности см': P_in,
          'Площадь сечения см²': S, 'ПТМ (мм)': X, 'Предел огнестойкости': fireRes, 'Площадь мп/м²': A1,
          'Площадь тн/м²': At, 'Толщина нанесения': th, 'Расход (кг/м²)': c2,
          'Количество': qty, 'Ед': unit, 'Итого (кг)': tot
        });
      }
    });
    return rows;
  }
}
