/* ================================================================
   UniTrack — Academic Tracking Application
   ================================================================ */

const APP_KEY = 'unitrack_data';

let state = {
    config: {
        carrera: '',
        universidad: '',
        duracion: 5,
        notaMin: 4,
        notaMax: 10,
    },
    materias: [],
};

// ======================== INIT ========================
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initNavigation();
    initModals();
    initConfig();
    initFilters();
    injectSVGDefs();
    renderAll();
});

// ======================== STATE ========================
function saveState() {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const raw = localStorage.getItem(APP_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            state = {
                config: { ...state.config, ...(parsed.config || {}) },
                materias: Array.isArray(parsed.materias) ? parsed.materias : [],
            };
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

// ======================== SVG GRADIENT ========================
function injectSVGDefs() {
    const svg = document.querySelector('.progress-ring');
    if (!svg) return;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8b5cf6"/>
            <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
    `;
    svg.insertBefore(defs, svg.firstChild);
}

// ======================== NAVIGATION ========================
function initNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('sidebarClose');

    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(link.dataset.section);
            closeSidebar();
        });
    });

    menuBtn.addEventListener('click', () => openSidebar());
    closeBtn.addEventListener('click', () => closeSidebar());
    overlay.addEventListener('click', () => closeSidebar());
}

function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

const pageMeta = {
    dashboard:    { title: 'Dashboard', subtitle: 'Resumen de tu carrera' },
    plan:         { title: 'Plan de Estudios', subtitle: 'Gestión de materias y correlativas' },
    materias:     { title: 'Mis Materias', subtitle: 'Detalle de notas y calificaciones' },
    estadisticas: { title: 'Estadísticas', subtitle: 'Análisis de tu rendimiento' },
    config:       { title: 'Configuración', subtitle: 'Ajustes de la aplicación' },
};

function navigateTo(section) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`section-${section}`);
    if (target) {
        target.classList.remove('hidden');
        // Re-trigger animation
        target.style.animation = 'none';
        target.offsetHeight; // reflow
        target.style.animation = '';
    }

    document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (activeLink) activeLink.classList.add('active');

    const meta = pageMeta[section] || {};
    document.getElementById('pageTitle').textContent = meta.title || section;
    document.getElementById('pageSubtitle').textContent = meta.subtitle || '';

    renderAll();
}

// ======================== RENDER ALL ========================
function renderAll() {
    renderSidebarInfo();
    renderDashboard();
    renderPlan();
    renderMaterias();
    renderEstadisticas();
    loadConfigForm();
    updateFilterYears();
}

function renderSidebarInfo() {
    const { carrera, universidad } = state.config;
    document.getElementById('sidebarCareerName').textContent = carrera || 'Configurá tu carrera';
    document.getElementById('sidebarUniName').textContent = universidad || '';

    const total = state.materias.length;
    const aprobadas = state.materias.filter(m => m.estado === 'aprobada').length;
    const pct = total > 0 ? Math.round((aprobadas / total) * 100) : 0;

    document.getElementById('sidebarProgressPct').textContent = pct + '%';
    document.getElementById('sidebarProgressFill').style.width = pct + '%';
}

// ======================== DASHBOARD ========================
function renderDashboard() {
    const materias = state.materias;
    const aprobadas = materias.filter(m => m.estado === 'aprobada');
    const cursando = materias.filter(m => m.estado === 'cursando');
    const pendientes = materias.filter(m => m.estado === 'pendiente' || m.estado === 'libre');
    const total = materias.length;

    // Notas finales de aprobadas
    const notasAprobadas = aprobadas
        .filter(m => m.notaFinal != null && m.notaFinal !== '')
        .map(m => ({ nota: parseFloat(m.notaFinal), nombre: m.nombre }));

    const notas = notasAprobadas.map(n => n.nota);
    const promedio = notas.length > 0
        ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2)
        : '-';

    document.getElementById('statPromedio').textContent = promedio;
    document.getElementById('statAprobadas').textContent = aprobadas.length;
    document.getElementById('statEnCurso').textContent = cursando.length;
    document.getElementById('statPendientes').textContent = pendientes.length;

    // Progress ring
    const pct = total > 0 ? Math.round((aprobadas.length / total) * 100) : 0;
    const circumference = 2 * Math.PI * 60; // r=60
    const offset = circumference - (pct / 100) * circumference;
    const ring = document.getElementById('progressRing');
    if (ring) {
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = offset;
    }
    document.getElementById('progressRingPct').textContent = pct + '%';
    document.getElementById('progressAprobadas').textContent = aprobadas.length;
    document.getElementById('progressTotal').textContent = total;
    document.getElementById('progressRestantes').textContent = total - aprobadas.length;

    // Averages
    const notasSinAplazos = notas.filter(n => n >= state.config.notaMin);
    const todasLasNotas = materias
        .filter(m => m.notaFinal != null && m.notaFinal !== '')
        .map(m => parseFloat(m.notaFinal));

    document.getElementById('avgSinAplazos').textContent =
        notasSinAplazos.length > 0
            ? (notasSinAplazos.reduce((a, b) => a + b, 0) / notasSinAplazos.length).toFixed(2)
            : '-';

    document.getElementById('avgConAplazos').textContent =
        todasLasNotas.length > 0
            ? (todasLasNotas.reduce((a, b) => a + b, 0) / todasLasNotas.length).toFixed(2)
            : '-';

    // Best / worst
    if (notasAprobadas.length > 0) {
        const best = notasAprobadas.reduce((a, b) => a.nota > b.nota ? a : b);
        document.getElementById('notaMasAlta').textContent = best.nota;
        document.getElementById('mejorMateriaName').textContent = best.nombre;

        const aprobMin = notasAprobadas.filter(n => n.nota >= state.config.notaMin);
        if (aprobMin.length > 0) {
            const worst = aprobMin.reduce((a, b) => a.nota < b.nota ? a : b);
            document.getElementById('notaMasBaja').textContent = worst.nota;
            document.getElementById('peorMateriaName').textContent = worst.nombre;
        } else {
            document.getElementById('notaMasBaja').textContent = '-';
            document.getElementById('peorMateriaName').textContent = '-';
        }
    } else {
        document.getElementById('notaMasAlta').textContent = '-';
        document.getElementById('mejorMateriaName').textContent = '-';
        document.getElementById('notaMasBaja').textContent = '-';
        document.getElementById('peorMateriaName').textContent = '-';
    }

    renderChartAnios();
    renderChartNotas();
}

function renderChartAnios() {
    const container = document.getElementById('chartAnios');
    container.innerHTML = '';
    const duracion = state.config.duracion;

    if (duracion === 0 || state.materias.length === 0) {
        container.innerHTML = '<div class="chart-empty">Agregá materias para ver el avance por año</div>';
        return;
    }

    const gradients = [
        'linear-gradient(90deg, #8b5cf6, #a78bfa)',
        'linear-gradient(90deg, #3b82f6, #60a5fa)',
        'linear-gradient(90deg, #10b981, #34d399)',
        'linear-gradient(90deg, #f59e0b, #fbbf24)',
        'linear-gradient(90deg, #ef4444, #f87171)',
        'linear-gradient(90deg, #ec4899, #f472b6)',
    ];

    for (let y = 1; y <= duracion; y++) {
        const total = state.materias.filter(m => m.anio == y).length;
        const aprob = state.materias.filter(m => m.anio == y && m.estado === 'aprobada').length;
        const pct = total > 0 ? Math.round((aprob / total) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        row.innerHTML = `
            <span class="chart-bar-label">${y}° Año</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width:${pct}%;background:${gradients[(y - 1) % gradients.length]}">${pct > 20 ? aprob + '/' + total : ''}</div>
            </div>
            <span class="chart-bar-num">${pct}%</span>
        `;
        container.appendChild(row);
    }
}

function renderChartNotas() {
    const container = document.getElementById('chartNotas');
    container.innerHTML = '';

    const max = state.config.notaMax;
    const min = state.config.notaMin;
    const buckets = {};
    for (let i = 1; i <= max; i++) buckets[i] = 0;

    state.materias
        .filter(m => m.notaFinal != null && m.notaFinal !== '')
        .forEach(m => {
            const n = Math.round(parseFloat(m.notaFinal));
            if (n >= 1 && n <= max) buckets[n]++;
        });

    const maxCount = Math.max(...Object.values(buckets), 1);

    if (maxCount === 0 || state.materias.filter(m => m.notaFinal != null && m.notaFinal !== '').length === 0) {
        container.innerHTML = '<div class="chart-empty">Cargá notas finales para ver la distribución</div>';
        return;
    }

    for (let i = 1; i <= max; i++) {
        const count = buckets[i];
        const pct = (count / maxCount) * 100;
        let color;
        if (i >= 7) color = 'linear-gradient(90deg, #10b981, #34d399)';
        else if (i >= min) color = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        else color = 'linear-gradient(90deg, #ef4444, #f87171)';

        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        row.innerHTML = `
            <span class="chart-bar-label">${i}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width:${pct}%;background:${color}">${count > 0 ? count : ''}</div>
            </div>
            <span class="chart-bar-num">${count}</span>
        `;
        container.appendChild(row);
    }
}

// ======================== PLAN DE ESTUDIOS ========================
function renderPlan() {
    const body = document.getElementById('bodyPlan');
    const fAnio = document.getElementById('filtroAnio').value;
    const fCuatri = document.getElementById('filtroCuatri').value;
    const fEstado = document.getElementById('filtroPlanEstado').value;
    const emptyEl = document.getElementById('emptyPlan');
    const tableCard = document.getElementById('planTableCard');

    let materias = [...state.materias].sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        if (a.cuatrimestre === b.cuatrimestre) return a.nombre.localeCompare(b.nombre);
        return a.cuatrimestre === 'anual' ? 1 : String(a.cuatrimestre).localeCompare(String(b.cuatrimestre));
    });

    if (fAnio) materias = materias.filter(m => m.anio == fAnio);
    if (fCuatri) materias = materias.filter(m => m.cuatrimestre === fCuatri);
    if (fEstado) materias = materias.filter(m => m.estado === fEstado);

    body.innerHTML = '';

    if (materias.length === 0 && state.materias.length === 0) {
        emptyEl.classList.remove('hidden');
        tableCard.style.display = 'none';
        return;
    }

    emptyEl.classList.add('hidden');
    tableCard.style.display = '';

    if (materias.length === 0) {
        body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No hay materias con ese filtro</td></tr>';
        return;
    }

    materias.forEach(m => {
        const corrs = (m.correlativas || [])
            .map(id => state.materias.find(x => x.id === id))
            .filter(Boolean)
            .map(x => esc(x.nombre))
            .join(', ');

        const cuatriLabel = m.cuatrimestre === 'anual' ? 'Anual' : `${m.cuatrimestre}° Cuatri`;
        const notaDisplay = (m.notaFinal != null && m.notaFinal !== '') ? m.notaFinal : '-';
        const notaClass = getNotaColorClass(m.notaFinal);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="td-name">${esc(m.nombre)}</td>
            <td>${m.anio}°</td>
            <td>${cuatriLabel}</td>
            <td>${m.creditos || '-'}</td>
            <td>${corrs || '<span style="color:var(--text-muted)">-</span>'}</td>
            <td class="td-nota ${notaClass}">${notaDisplay}</td>
            <td><span class="badge badge-${m.estado}">${capitalize(m.estado)}</span></td>
            <td>
                <div class="td-actions">
                    <button class="btn-icon-only" title="Editar" data-edit="${m.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon-only danger" title="Eliminar" data-delete="${m.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });

    // Delegate events
    body.querySelectorAll('[data-edit]').forEach(btn =>
        btn.addEventListener('click', () => openMateriaModal(btn.dataset.edit))
    );
    body.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => confirmDeleteMateria(btn.dataset.delete))
    );
}

// ======================== MIS MATERIAS (cards) ========================
function renderMaterias() {
    const container = document.getElementById('materiasCards');
    const fEstado = document.getElementById('filtroEstado').value;
    const search = document.getElementById('buscarMateria').value.toLowerCase().trim();
    const emptyEl = document.getElementById('emptyMaterias');

    let materias = [...state.materias].sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        return a.nombre.localeCompare(b.nombre);
    });

    if (fEstado) materias = materias.filter(m => m.estado === fEstado);
    if (search) materias = materias.filter(m => m.nombre.toLowerCase().includes(search));

    container.innerHTML = '';

    if (materias.length === 0) {
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    materias.forEach(m => {
        const cuatriLabel = m.cuatrimestre === 'anual' ? 'Anual' : `${m.cuatrimestre}° Cuatri`;

        const chips = [
            { label: '1er Parcial', value: m.nota1Parcial },
            { label: '2do Parcial', value: m.nota2Parcial },
            { label: 'Recup.', value: m.notaRecuperatorio },
            { label: 'TP', value: m.notaTP },
            { label: 'Final', value: m.notaFinal },
        ];

        if (m.fechaAprobacion) {
            chips.push({ label: 'Fecha', value: formatDate(m.fechaAprobacion), isDate: true });
        }

        const chipsHtml = chips.map(c => {
            if (c.isDate) {
                return `<div class="nota-chip"><span class="nota-chip-label">${c.label}</span><span class="nota-chip-value n-none" style="font-size:0.82rem">${c.value}</span></div>`;
            }
            const val = (c.value != null && c.value !== '') ? parseFloat(c.value) : null;
            const display = val !== null ? val : '-';
            let cls = 'n-none';
            if (val !== null) {
                if (val >= 7) cls = 'n-high';
                else if (val >= state.config.notaMin) cls = 'n-mid';
                else cls = 'n-low';
            }
            return `<div class="nota-chip"><span class="nota-chip-label">${c.label}</span><span class="nota-chip-value ${cls}">${display}</span></div>`;
        }).join('');

        const card = document.createElement('div');
        card.className = 'm-card';
        card.innerHTML = `
            <div class="m-card-top">
                <div>
                    <div class="m-card-title">${esc(m.nombre)}</div>
                    <div class="m-card-meta">${m.anio}° Año &middot; ${cuatriLabel} &middot; ${m.creditos || 0} hs</div>
                </div>
                <span class="badge badge-${m.estado}">${capitalize(m.estado)}</span>
            </div>
            <div class="m-card-notas">${chipsHtml}</div>
            ${m.observaciones ? `<div class="m-card-obs">${esc(m.observaciones)}</div>` : ''}
            <div class="m-card-footer">
                <button class="btn btn-sm btn-outline" data-edit="${m.id}">Editar</button>
                <button class="btn btn-sm btn-danger" data-delete="${m.id}">Eliminar</button>
            </div>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll('[data-edit]').forEach(btn =>
        btn.addEventListener('click', () => openMateriaModal(btn.dataset.edit))
    );
    container.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => confirmDeleteMateria(btn.dataset.delete))
    );
}

// ======================== ESTADÍSTICAS ========================
function renderEstadisticas() {
    const materias = state.materias;
    const aprobadas = materias.filter(m => m.estado === 'aprobada');
    const total = materias.length;

    document.getElementById('statTotalMaterias').textContent = total;
    document.getElementById('statPorcentaje').textContent =
        total > 0 ? Math.round((aprobadas.length / total) * 100) + '%' : '0%';

    const notasAp = aprobadas.filter(m => m.notaFinal != null && m.notaFinal !== '').map(m => parseFloat(m.notaFinal));

    document.getElementById('statMejorNota').textContent =
        notasAp.length > 0 ? Math.max(...notasAp) : '-';

    document.getElementById('statPromedioAprobadas').textContent =
        notasAp.length > 0
            ? (notasAp.reduce((a, b) => a + b, 0) / notasAp.length).toFixed(2)
            : '-';

    renderProgressPorAnio();
    renderChartEstados();
    renderChartHistorial();
    renderTablaEstadisticas();
}

function renderProgressPorAnio() {
    const container = document.getElementById('progressPorAnio');
    container.innerHTML = '';

    for (let y = 1; y <= state.config.duracion; y++) {
        const total = state.materias.filter(m => m.anio == y).length;
        const aprob = state.materias.filter(m => m.anio == y && m.estado === 'aprobada').length;
        const pct = total > 0 ? Math.round((aprob / total) * 100) : 0;

        const div = document.createElement('div');
        div.className = 'year-progress-item';
        div.innerHTML = `
            <div class="year-progress-header">
                <strong>${y}° Año</strong>
                <span>${aprob} / ${total} materias &middot; ${pct}%</span>
            </div>
            <div class="year-progress-bar">
                <div class="year-progress-fill" style="width:${pct}%"></div>
            </div>
        `;
        container.appendChild(div);
    }

    if (state.config.duracion === 0) {
        container.innerHTML = '<div class="chart-empty">Configurá la duración de tu carrera</div>';
    }
}

function renderChartEstados() {
    const container = document.getElementById('chartEstados');
    container.innerHTML = '';

    const estados = [
        { key: 'aprobada', label: 'Aprobadas', color: 'linear-gradient(90deg, #10b981, #34d399)' },
        { key: 'cursando', label: 'Cursando', color: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
        { key: 'pendiente', label: 'Pendientes', color: 'linear-gradient(90deg, #f59e0b, #fbbf24)' },
        { key: 'libre', label: 'Libre', color: 'linear-gradient(90deg, #ef4444, #f87171)' },
    ];

    const total = state.materias.length || 1;

    estados.forEach(e => {
        const count = state.materias.filter(m => m.estado === e.key).length;
        const pct = Math.round((count / total) * 100);

        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        row.innerHTML = `
            <span class="chart-bar-label">${e.label}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width:${pct}%;background:${e.color}">${pct > 12 ? count : ''}</div>
            </div>
            <span class="chart-bar-num">${count}</span>
        `;
        container.appendChild(row);
    });
}

function renderChartHistorial() {
    const container = document.getElementById('chartHistorial');
    container.innerHTML = '';

    const aprobadas = state.materias
        .filter(m => m.estado === 'aprobada' && m.notaFinal != null && m.notaFinal !== '')
        .sort((a, b) => {
            if (a.fechaAprobacion && b.fechaAprobacion) return new Date(a.fechaAprobacion) - new Date(b.fechaAprobacion);
            return 0;
        });

    if (aprobadas.length === 0) {
        container.innerHTML = '<div class="chart-empty">Aún no hay notas para mostrar</div>';
        return;
    }

    const max = state.config.notaMax;

    aprobadas.slice(-12).forEach(m => {
        const nota = parseFloat(m.notaFinal);
        const pct = (nota / max) * 100;
        let color;
        if (nota >= 7) color = 'linear-gradient(90deg, #10b981, #34d399)';
        else if (nota >= state.config.notaMin) color = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        else color = 'linear-gradient(90deg, #ef4444, #f87171)';

        const shortName = m.nombre.length > 14 ? m.nombre.substring(0, 14) + '...' : m.nombre;

        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        row.title = m.nombre;
        row.innerHTML = `
            <span class="chart-bar-label">${esc(shortName)}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width:${pct}%;background:${color}">${nota}</div>
            </div>
            <span class="chart-bar-num">${nota}</span>
        `;
        container.appendChild(row);
    });
}

function renderTablaEstadisticas() {
    const body = document.getElementById('bodyEstadisticas');
    body.innerHTML = '';

    const materias = [...state.materias].sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        return a.nombre.localeCompare(b.nombre);
    });

    if (materias.length === 0) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Sin datos</td></tr>';
        return;
    }

    materias.forEach(m => {
        const cuatriLabel = m.cuatrimestre === 'anual' ? 'Anual' : `${m.cuatrimestre}°`;
        const notaDisplay = (m.notaFinal != null && m.notaFinal !== '') ? m.notaFinal : '-';
        const notaClass = getNotaColorClass(m.notaFinal);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="td-name">${esc(m.nombre)}</td>
            <td>${m.anio}°</td>
            <td>${cuatriLabel}</td>
            <td><span class="badge badge-${m.estado}">${capitalize(m.estado)}</span></td>
            <td class="td-nota ${notaClass}">${notaDisplay}</td>
            <td>${m.fechaAprobacion ? formatDate(m.fechaAprobacion) : '<span style="color:var(--text-muted)">-</span>'}</td>
        `;
        body.appendChild(tr);
    });
}

// ======================== MODALS ========================
function initModals() {
    // Materia modal
    const modal = document.getElementById('modalMateria');
    document.getElementById('btnAgregarMateria').addEventListener('click', () => openMateriaModal());
    document.getElementById('btnEmptyAdd').addEventListener('click', () => openMateriaModal());
    document.getElementById('modalMateriaClose').addEventListener('click', () => closeMateriaModal());
    document.getElementById('modalMateriaCancel').addEventListener('click', () => closeMateriaModal());
    document.getElementById('modalMateriaSave').addEventListener('click', () => saveMateria());
    modal.addEventListener('click', e => { if (e.target === modal) closeMateriaModal(); });

    // Confirm modal
    const confirm = document.getElementById('modalConfirm');
    document.getElementById('modalConfirmClose').addEventListener('click', () => closeConfirmModal());
    document.getElementById('confirmCancel').addEventListener('click', () => closeConfirmModal());
    confirm.addEventListener('click', e => { if (e.target === confirm) closeConfirmModal(); });

    // Estado toggle notas
    document.getElementById('materiaEstado').addEventListener('change', toggleNotasSection);
}

function toggleNotasSection() {
    const estado = document.getElementById('materiaEstado').value;
    const section = document.getElementById('seccionNotas');
    if (estado === 'pendiente') {
        section.classList.add('notas-hidden');
    } else {
        section.classList.remove('notas-hidden');
    }
}

function openMateriaModal(id = null) {
    const modal = document.getElementById('modalMateria');
    const title = document.getElementById('modalMateriaTitle');

    // Populate year select
    const selAnio = document.getElementById('materiaAnio');
    selAnio.innerHTML = '';
    for (let i = 1; i <= state.config.duracion; i++) {
        selAnio.innerHTML += `<option value="${i}">${i}° Año</option>`;
    }

    // Populate correlativas
    populateCorrelativas(id);

    if (id) {
        const m = state.materias.find(x => x.id === id);
        if (!m) return;
        title.textContent = 'Editar Materia';
        document.getElementById('materiaId').value = m.id;
        document.getElementById('materiaNombre').value = m.nombre;
        document.getElementById('materiaAnio').value = m.anio;
        document.getElementById('materiaCuatri').value = m.cuatrimestre;
        document.getElementById('materiaCreditos').value = m.creditos || 0;
        document.getElementById('materiaEstado').value = m.estado;
        document.getElementById('nota1Parcial').value = m.nota1Parcial ?? '';
        document.getElementById('nota2Parcial').value = m.nota2Parcial ?? '';
        document.getElementById('notaRecuperatorio').value = m.notaRecuperatorio ?? '';
        document.getElementById('notaTP').value = m.notaTP ?? '';
        document.getElementById('notaFinal').value = m.notaFinal ?? '';
        document.getElementById('fechaAprobacion').value = m.fechaAprobacion || '';
        document.getElementById('materiaObs').value = m.observaciones || '';

        (m.correlativas || []).forEach(cId => {
            const cb = document.querySelector(`#correlativasList input[value="${cId}"]`);
            if (cb) cb.checked = true;
        });
    } else {
        title.textContent = 'Agregar Materia';
        document.getElementById('materiaId').value = '';
        document.getElementById('materiaNombre').value = '';
        document.getElementById('materiaCreditos').value = 0;
        document.getElementById('materiaEstado').value = 'pendiente';
        document.getElementById('nota1Parcial').value = '';
        document.getElementById('nota2Parcial').value = '';
        document.getElementById('notaRecuperatorio').value = '';
        document.getElementById('notaTP').value = '';
        document.getElementById('notaFinal').value = '';
        document.getElementById('fechaAprobacion').value = '';
        document.getElementById('materiaObs').value = '';
    }

    toggleNotasSection();
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('materiaNombre').focus(), 100);
}

function populateCorrelativas(excludeId) {
    const container = document.getElementById('correlativasList');
    container.innerHTML = '';

    const materias = state.materias
        .filter(m => m.id !== excludeId)
        .sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.nombre.localeCompare(b.nombre));

    if (materias.length === 0) {
        container.innerHTML = '<span class="corr-empty">No hay otras materias cargadas</span>';
        return;
    }

    materias.forEach(m => {
        const div = document.createElement('div');
        div.className = 'corr-item';
        div.innerHTML = `
            <input type="checkbox" id="corr_${m.id}" value="${m.id}">
            <label for="corr_${m.id}">${m.anio}° - ${esc(m.nombre)}</label>
        `;
        container.appendChild(div);
    });
}

function closeMateriaModal() {
    document.getElementById('modalMateria').classList.add('hidden');
}

function saveMateria() {
    const nombre = document.getElementById('materiaNombre').value.trim();
    if (!nombre) {
        toast('Ingresá un nombre para la materia', 'error');
        document.getElementById('materiaNombre').focus();
        return;
    }

    const id = document.getElementById('materiaId').value || genId();
    const anio = parseInt(document.getElementById('materiaAnio').value);
    const cuatrimestre = document.getElementById('materiaCuatri').value;
    const creditos = parseInt(document.getElementById('materiaCreditos').value) || 0;
    const estado = document.getElementById('materiaEstado').value;
    const nota1Parcial = parseNota(document.getElementById('nota1Parcial').value);
    const nota2Parcial = parseNota(document.getElementById('nota2Parcial').value);
    const notaRecuperatorio = parseNota(document.getElementById('notaRecuperatorio').value);
    const notaTP = parseNota(document.getElementById('notaTP').value);
    const notaFinal = parseNota(document.getElementById('notaFinal').value);
    const fechaAprobacion = document.getElementById('fechaAprobacion').value || '';
    const observaciones = document.getElementById('materiaObs').value.trim();

    const correlativas = [];
    document.querySelectorAll('#correlativasList input:checked').forEach(cb => correlativas.push(cb.value));

    const materia = {
        id, nombre, anio, cuatrimestre, creditos, estado,
        nota1Parcial, nota2Parcial, notaRecuperatorio, notaTP, notaFinal,
        fechaAprobacion, observaciones, correlativas,
    };

    const idx = state.materias.findIndex(m => m.id === id);
    if (idx >= 0) {
        state.materias[idx] = materia;
        toast('Materia actualizada', 'success');
    } else {
        state.materias.push(materia);
        toast('Materia agregada', 'success');
    }

    saveState();
    closeMateriaModal();
    renderAll();
}

// ======================== DELETE ========================
function confirmDeleteMateria(id) {
    const materia = state.materias.find(m => m.id === id);
    if (!materia) return;

    document.getElementById('confirmMsg').textContent =
        `¿Eliminar "${materia.nombre}"? Esta acción no se puede deshacer.`;

    const modal = document.getElementById('modalConfirm');
    modal.classList.remove('hidden');

    const btnOk = document.getElementById('confirmOk');
    const newBtn = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtn, btnOk);

    newBtn.addEventListener('click', () => {
        state.materias = state.materias.filter(m => m.id !== id);
        state.materias.forEach(m => {
            m.correlativas = (m.correlativas || []).filter(cId => cId !== id);
        });
        saveState();
        renderAll();
        closeConfirmModal();
        toast('Materia eliminada', 'info');
    });
}

function closeConfirmModal() {
    document.getElementById('modalConfirm').classList.add('hidden');
}

// ======================== FILTERS ========================
function initFilters() {
    document.getElementById('filtroAnio').addEventListener('change', renderPlan);
    document.getElementById('filtroCuatri').addEventListener('change', renderPlan);
    document.getElementById('filtroPlanEstado').addEventListener('change', renderPlan);
    document.getElementById('filtroEstado').addEventListener('change', renderMaterias);
    document.getElementById('buscarMateria').addEventListener('input', renderMaterias);
}

function updateFilterYears() {
    const select = document.getElementById('filtroAnio');
    const current = select.value;
    select.innerHTML = '<option value="">Todos</option>';
    for (let i = 1; i <= state.config.duracion; i++) {
        select.innerHTML += `<option value="${i}" ${current == i ? 'selected' : ''}>${i}° Año</option>`;
    }
}

// ======================== CONFIG ========================
function initConfig() {
    document.getElementById('btnGuardarConfig').addEventListener('click', saveConfig);
    document.getElementById('btnExportar').addEventListener('click', exportData);
    document.getElementById('btnImportar').addEventListener('change', importData);
    document.getElementById('btnReset').addEventListener('click', resetData);
}

function loadConfigForm() {
    document.getElementById('configCarrera').value = state.config.carrera || '';
    document.getElementById('configUniversidad').value = state.config.universidad || '';
    document.getElementById('configDuracion').value = state.config.duracion || 5;
    document.getElementById('configNotaMin').value = state.config.notaMin || 4;
    document.getElementById('configNotaMax').value = state.config.notaMax || 10;
}

function saveConfig() {
    state.config.carrera = document.getElementById('configCarrera').value.trim();
    state.config.universidad = document.getElementById('configUniversidad').value.trim();
    state.config.duracion = parseInt(document.getElementById('configDuracion').value) || 5;
    state.config.notaMin = parseInt(document.getElementById('configNotaMin').value) || 4;
    state.config.notaMax = parseInt(document.getElementById('configNotaMax').value) || 10;
    saveState();
    renderAll();
    toast('Configuración guardada', 'success');
}

function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unitrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Datos exportados', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.config && Array.isArray(data.materias)) {
                state = { config: { ...state.config, ...data.config }, materias: data.materias };
                saveState();
                renderAll();
                toast('Datos importados correctamente', 'success');
            } else {
                toast('El archivo no tiene el formato correcto', 'error');
            }
        } catch {
            toast('Error al leer el archivo', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function resetData() {
    document.getElementById('confirmMsg').textContent =
        '¿Borrar TODOS los datos? Esta acción es irreversible.';

    const modal = document.getElementById('modalConfirm');
    modal.classList.remove('hidden');

    const btnOk = document.getElementById('confirmOk');
    const newBtn = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtn, btnOk);

    newBtn.addEventListener('click', () => {
        state = {
            config: { carrera: '', universidad: '', duracion: 5, notaMin: 4, notaMax: 10 },
            materias: [],
        };
        saveState();
        renderAll();
        closeConfirmModal();
        toast('Todos los datos fueron borrados', 'info');
    });
}

// ======================== UTILITIES ========================
function genId() {
    return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function parseNota(val) {
    if (val === '' || val == null) return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}

function getNotaColorClass(nota) {
    if (nota == null || nota === '') return '';
    const n = parseFloat(nota);
    if (isNaN(n)) return '';
    if (n >= 7) return 'n-high';
    if (n >= state.config.notaMin) return 'n-mid';
    return 'n-low';
}

// ======================== TOAST ========================
function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;

    const icons = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    t.innerHTML = (icons[type] || icons.info) + `<span>${esc(message)}</span>`;
    container.appendChild(t);

    setTimeout(() => {
        t.classList.add('toast-out');
        setTimeout(() => t.remove(), 300);
    }, 3000);
}
