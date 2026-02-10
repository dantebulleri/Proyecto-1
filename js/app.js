// === ESTADO GLOBAL ===
const APP_KEY = 'miCarrera';

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

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    initNavigation();
    initModals();
    initConfig();
    initFilters();
    renderAll();
});

// === PERSISTENCIA ===
function guardarDatos() {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
}

function cargarDatos() {
    const saved = localStorage.getItem(APP_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        } catch (e) {
            console.error('Error al cargar datos:', e);
        }
    }
}

// === NAVEGACIÓN ===
function initNavigation() {
    const links = document.querySelectorAll('.nav-links a');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateTo(section);
            sidebar.classList.remove('open');
        });
    });

    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    sidebarToggle.addEventListener('click', () => sidebar.classList.remove('open'));
}

function navigateTo(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${section}`).classList.remove('hidden');

    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.nav-links a[data-section="${section}"]`).classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        plan: 'Plan de Estudios',
        materias: 'Mis Materias',
        estadisticas: 'Estadísticas',
        config: 'Configuración',
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;

    renderAll();
}

// === RENDER GENERAL ===
function renderAll() {
    renderDashboard();
    renderPlan();
    renderMaterias();
    renderEstadisticas();
    loadConfigForm();
    updateFiltroAnios();
}

// === DASHBOARD ===
function renderDashboard() {
    const materias = state.materias;
    const aprobadas = materias.filter(m => m.estado === 'aprobada');
    const cursando = materias.filter(m => m.estado === 'cursando');
    const pendientes = materias.filter(m => m.estado === 'pendiente');
    const total = materias.length;

    // Promedio general (notas finales de aprobadas)
    const notasFinales = aprobadas
        .filter(m => m.notaFinal != null && m.notaFinal !== '')
        .map(m => parseFloat(m.notaFinal));

    const promedio = notasFinales.length > 0
        ? (notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length).toFixed(2)
        : '-';

    document.getElementById('statPromedio').textContent = promedio;
    document.getElementById('statAprobadas').textContent = aprobadas.length;
    document.getElementById('statEnCurso').textContent = cursando.length;
    document.getElementById('statPendientes').textContent = pendientes.length;

    // Progreso
    const pct = total > 0 ? Math.round((aprobadas.length / total) * 100) : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressText').textContent = pct + '%';
    document.getElementById('progressDetail').textContent =
        `${aprobadas.length} de ${total} materias completadas`;

    // Promedios detallados
    const notasSinAplazos = aprobadas
        .filter(m => m.notaFinal != null && m.notaFinal !== '' && parseFloat(m.notaFinal) >= state.config.notaMin)
        .map(m => parseFloat(m.notaFinal));

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

    document.getElementById('notaMasAlta').textContent =
        notasFinales.length > 0 ? Math.max(...notasFinales) : '-';

    const aprobMin = notasFinales.filter(n => n >= state.config.notaMin);
    document.getElementById('notaMasBaja').textContent =
        aprobMin.length > 0 ? Math.min(...aprobMin) : '-';

    // Gráfico por años
    renderChartAnios();
    // Gráfico distribución de notas
    renderChartNotas();
}

function renderChartAnios() {
    const container = document.getElementById('chartAnios');
    container.innerHTML = '';
    const duracion = state.config.duracion;
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    for (let y = 1; y <= duracion; y++) {
        const total = state.materias.filter(m => m.anio == y).length;
        const aprob = state.materias.filter(m => m.anio == y && m.estado === 'aprobada').length;
        const pct = total > 0 ? Math.round((aprob / total) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = `
            <span class="bar-label">Año ${y}</span>
            <div class="bar-track">
                <div class="bar-value" style="width: ${pct}%; background: ${colors[y % colors.length]}">
                    ${pct > 15 ? aprob + '/' + total : ''}
                </div>
            </div>
            <span class="bar-number">${pct}%</span>
        `;
        container.appendChild(row);
    }

    if (duracion === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Configurá la duración de tu carrera</p>';
    }
}

function renderChartNotas() {
    const container = document.getElementById('chartNotas');
    container.innerHTML = '';

    const notaMax = state.config.notaMax;
    const notaMin = state.config.notaMin;
    const buckets = {};

    for (let i = 1; i <= notaMax; i++) {
        buckets[i] = 0;
    }

    state.materias
        .filter(m => m.notaFinal != null && m.notaFinal !== '')
        .forEach(m => {
            const nota = Math.round(parseFloat(m.notaFinal));
            if (nota >= 1 && nota <= notaMax) buckets[nota]++;
        });

    const maxCount = Math.max(...Object.values(buckets), 1);

    for (let i = 1; i <= notaMax; i++) {
        const count = buckets[i];
        const pct = (count / maxCount) * 100;
        let color = i >= notaMin ? (i >= 7 ? 'var(--success)' : 'var(--warning)') : 'var(--danger)';

        const row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = `
            <span class="bar-label">${i}</span>
            <div class="bar-track">
                <div class="bar-value" style="width: ${pct}%; background: ${color}">
                    ${count > 0 ? count : ''}
                </div>
            </div>
            <span class="bar-number">${count}</span>
        `;
        container.appendChild(row);
    }
}

// === PLAN DE ESTUDIOS ===
function renderPlan() {
    const body = document.getElementById('bodyPlan');
    const filtroAnio = document.getElementById('filtroAnio').value;
    const filtroCuatri = document.getElementById('filtroCuatri').value;
    const emptyMsg = document.getElementById('emptyPlan');

    let materias = [...state.materias].sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        if (a.cuatrimestre === b.cuatrimestre) return a.nombre.localeCompare(b.nombre);
        return a.cuatrimestre === 'anual' ? 1 : a.cuatrimestre - b.cuatrimestre;
    });

    if (filtroAnio) materias = materias.filter(m => m.anio == filtroAnio);
    if (filtroCuatri) materias = materias.filter(m => m.cuatrimestre === filtroCuatri);

    body.innerHTML = '';

    if (materias.length === 0) {
        emptyMsg.classList.remove('hidden');
        document.querySelector('#section-plan .table-container').classList.add('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');
    document.querySelector('#section-plan .table-container').classList.remove('hidden');

    materias.forEach(m => {
        const correlativas = (m.correlativas || [])
            .map(id => {
                const mat = state.materias.find(x => x.id === id);
                return mat ? mat.nombre : '';
            })
            .filter(Boolean)
            .join(', ');

        const cuatriLabel = m.cuatrimestre === 'anual' ? 'Anual' : `${m.cuatrimestre}° Cuatri`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(m.nombre)}</strong></td>
            <td>${m.anio}°</td>
            <td>${cuatriLabel}</td>
            <td>${m.creditos || '-'}</td>
            <td>${escapeHtml(correlativas) || '-'}</td>
            <td><span class="badge badge-${m.estado}">${capitalize(m.estado)}</span></td>
            <td>
                <button class="btn-icon" title="Editar" onclick="editarMateria('${m.id}')">&#9998;</button>
                <button class="btn-icon" title="Eliminar" onclick="eliminarMateria('${m.id}')">&#128465;</button>
            </td>
        `;
        body.appendChild(tr);
    });
}

// === MIS MATERIAS (cards con notas) ===
function renderMaterias() {
    const container = document.getElementById('materiasCards');
    const filtroEstado = document.getElementById('filtroEstado').value;
    const busqueda = document.getElementById('buscarMateria').value.toLowerCase();
    const emptyMsg = document.getElementById('emptyMaterias');

    let materias = [...state.materias].sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        return a.nombre.localeCompare(b.nombre);
    });

    if (filtroEstado) materias = materias.filter(m => m.estado === filtroEstado);
    if (busqueda) materias = materias.filter(m => m.nombre.toLowerCase().includes(busqueda));

    container.innerHTML = '';

    if (materias.length === 0) {
        emptyMsg.classList.remove('hidden');
        return;
    }
    emptyMsg.classList.add('hidden');

    materias.forEach(m => {
        const card = document.createElement('div');
        card.className = 'materia-card';

        const cuatriLabel = m.cuatrimestre === 'anual' ? 'Anual' : `${m.cuatrimestre}° Cuatri`;

        const notas = [
            { label: '1° Parcial', value: m.nota1Parcial },
            { label: '2° Parcial', value: m.nota2Parcial },
            { label: 'Recup.', value: m.notaRecuperatorio },
            { label: 'TP', value: m.notaTP },
            { label: 'Final', value: m.notaFinal },
        ];

        const notasHtml = notas.map(n => {
            const val = n.value != null && n.value !== '' ? parseFloat(n.value) : null;
            let cls = 'nota-none';
            let display = '-';
            if (val !== null) {
                display = val;
                if (val >= 7) cls = 'nota-alta';
                else if (val >= state.config.notaMin) cls = 'nota-media';
                else cls = 'nota-baja';
            }
            return `<div class="nota-item"><span class="nota-label">${n.label}</span><span class="nota-value ${cls}">${display}</span></div>`;
        }).join('');

        const fechaHtml = m.fechaAprobacion
            ? `<div class="nota-item"><span class="nota-label">Fecha</span><span class="nota-value nota-none">${formatDate(m.fechaAprobacion)}</span></div>`
            : '';

        card.innerHTML = `
            <div class="materia-card-header">
                <h4>${escapeHtml(m.nombre)}</h4>
                <span class="badge badge-${m.estado}">${capitalize(m.estado)}</span>
            </div>
            <div class="materia-card-body">
                <div class="materia-info">${m.anio}° Año - ${cuatriLabel} | ${m.creditos || 0} hs/créditos</div>
                <div class="notas-grid">
                    ${notasHtml}
                    ${fechaHtml}
                </div>
                ${m.observaciones ? `<div class="materia-obs">${escapeHtml(m.observaciones)}</div>` : ''}
            </div>
            <div class="materia-card-actions">
                <button class="btn btn-sm btn-secondary" onclick="editarMateria('${m.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarMateria('${m.id}')">Eliminar</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// === ESTADÍSTICAS ===
function renderEstadisticas() {
    const materias = state.materias;
    const aprobadas = materias.filter(m => m.estado === 'aprobada');
    const total = materias.length;

    document.getElementById('statTotalMaterias').textContent = total;
    document.getElementById('statPorcentaje').textContent =
        total > 0 ? Math.round((aprobadas.length / total) * 100) + '%' : '0%';

    const notasAprobadas = aprobadas
        .filter(m => m.notaFinal != null && m.notaFinal !== '')
        .map(m => parseFloat(m.notaFinal));

    document.getElementById('statMejorMateria').textContent =
        notasAprobadas.length > 0 ? Math.max(...notasAprobadas) : '-';

    document.getElementById('statPromedioAprobadas').textContent =
        notasAprobadas.length > 0
            ? (notasAprobadas.reduce((a, b) => a + b, 0) / notasAprobadas.length).toFixed(2)
            : '-';

    // Progreso por año
    renderProgressPorAnio();
    // Chart estados
    renderChartEstados();
    // Historial
    renderChartHistorial();
    // Tabla detalle
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
        div.className = 'year-progress';
        div.innerHTML = `
            <div class="year-progress-header">
                <strong>Año ${y}</strong>
                <span>${aprob} / ${total} materias (${pct}%)</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${pct}%"></div>
            </div>
        `;
        container.appendChild(div);
    }
}

function renderChartEstados() {
    const container = document.getElementById('chartEstados');
    container.innerHTML = '';

    const estados = ['aprobada', 'cursando', 'pendiente', 'libre'];
    const colores = {
        aprobada: 'var(--success)',
        cursando: 'var(--info)',
        pendiente: 'var(--warning)',
        libre: 'var(--danger)',
    };

    const total = state.materias.length || 1;

    estados.forEach(est => {
        const count = state.materias.filter(m => m.estado === est).length;
        const pct = Math.round((count / total) * 100);

        const row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = `
            <span class="bar-label">${capitalize(est)}</span>
            <div class="bar-track">
                <div class="bar-value" style="width: ${pct}%; background: ${colores[est]}">
                    ${pct > 10 ? count : ''}
                </div>
            </div>
            <span class="bar-number">${count}</span>
        `;
        container.appendChild(row);
    });
}

function renderChartHistorial() {
    const container = document.getElementById('chartHistorial');
    container.innerHTML = '';

    const aprobadas = state.materias
        .filter(m => m.estado === 'aprobada' && m.notaFinal != null && m.notaFinal !== '' && m.fechaAprobacion)
        .sort((a, b) => new Date(a.fechaAprobacion) - new Date(b.fechaAprobacion));

    if (aprobadas.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay datos de historial aún</p>';
        return;
    }

    const max = state.config.notaMax;

    aprobadas.slice(-15).forEach(m => {
        const nota = parseFloat(m.notaFinal);
        const pct = (nota / max) * 100;
        let color = nota >= 7 ? 'var(--success)' : nota >= state.config.notaMin ? 'var(--warning)' : 'var(--danger)';

        const row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = `
            <span class="bar-label" title="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre.substring(0, 12))}${m.nombre.length > 12 ? '...' : ''}</span>
            <div class="bar-track">
                <div class="bar-value" style="width: ${pct}%; background: ${color}">
                    ${nota}
                </div>
            </div>
            <span class="bar-number">${nota}</span>
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

    materias.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(m.nombre)}</td>
            <td>${m.anio}°</td>
            <td><span class="badge badge-${m.estado}">${capitalize(m.estado)}</span></td>
            <td><strong>${m.notaFinal != null && m.notaFinal !== '' ? m.notaFinal : '-'}</strong></td>
            <td>${m.fechaAprobacion ? formatDate(m.fechaAprobacion) : '-'}</td>
        `;
        body.appendChild(tr);
    });
}

// === MODALS ===
function initModals() {
    // Modal materia
    const modalMateria = document.getElementById('modalMateria');
    const btnAgregar = document.getElementById('btnAgregarMateria');
    const btnClose = document.getElementById('modalMateriaClose');
    const btnCancel = document.getElementById('modalMateriaCancel');
    const btnSave = document.getElementById('modalMateriaSave');

    btnAgregar.addEventListener('click', () => abrirModalMateria());
    btnClose.addEventListener('click', () => cerrarModalMateria());
    btnCancel.addEventListener('click', () => cerrarModalMateria());
    btnSave.addEventListener('click', () => guardarMateria());

    modalMateria.addEventListener('click', (e) => {
        if (e.target === modalMateria) cerrarModalMateria();
    });

    // Modal confirmación
    const modalConfirm = document.getElementById('modalConfirm');
    document.getElementById('modalConfirmClose').addEventListener('click', () => {
        modalConfirm.classList.add('hidden');
    });
    document.getElementById('confirmCancel').addEventListener('click', () => {
        modalConfirm.classList.add('hidden');
    });
    modalConfirm.addEventListener('click', (e) => {
        if (e.target === modalConfirm) modalConfirm.classList.add('hidden');
    });

    // Toggle notas según estado
    document.getElementById('materiaEstado').addEventListener('change', toggleSeccionNotas);
}

function toggleSeccionNotas() {
    const estado = document.getElementById('materiaEstado').value;
    const seccion = document.getElementById('seccionNotas');
    seccion.style.display = (estado === 'pendiente') ? 'none' : 'block';
}

function abrirModalMateria(id = null) {
    const modal = document.getElementById('modalMateria');
    const title = document.getElementById('modalMateriaTitle');

    // Populate año options
    const selectAnio = document.getElementById('materiaAnio');
    selectAnio.innerHTML = '';
    for (let i = 1; i <= state.config.duracion; i++) {
        selectAnio.innerHTML += `<option value="${i}">${i}° Año</option>`;
    }

    // Populate correlativas
    renderCorrelativas(id);

    if (id) {
        title.textContent = 'Editar Materia';
        const m = state.materias.find(x => x.id === id);
        if (!m) return;
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

        // Check correlativas
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

    toggleSeccionNotas();
    modal.classList.remove('hidden');
    document.getElementById('materiaNombre').focus();
}

function renderCorrelativas(excludeId) {
    const container = document.getElementById('correlativasList');
    container.innerHTML = '';

    const materias = state.materias.filter(m => m.id !== excludeId).sort((a, b) =>
        a.anio !== b.anio ? a.anio - b.anio : a.nombre.localeCompare(b.nombre)
    );

    if (materias.length === 0) {
        container.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">No hay materias cargadas aún</span>';
        return;
    }

    materias.forEach(m => {
        const div = document.createElement('div');
        div.className = 'correlativa-item';
        div.innerHTML = `
            <input type="checkbox" id="corr_${m.id}" value="${m.id}">
            <label for="corr_${m.id}">${m.anio}° - ${escapeHtml(m.nombre)}</label>
        `;
        container.appendChild(div);
    });
}

function cerrarModalMateria() {
    document.getElementById('modalMateria').classList.add('hidden');
}

function guardarMateria() {
    const nombre = document.getElementById('materiaNombre').value.trim();
    if (!nombre) {
        toast('Ingresá un nombre para la materia', 'error');
        return;
    }

    const id = document.getElementById('materiaId').value || generarId();
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
    document.querySelectorAll('#correlativasList input:checked').forEach(cb => {
        correlativas.push(cb.value);
    });

    const materia = {
        id, nombre, anio, cuatrimestre, creditos, estado,
        nota1Parcial, nota2Parcial, notaRecuperatorio, notaTP, notaFinal,
        fechaAprobacion, observaciones, correlativas,
    };

    const existingIdx = state.materias.findIndex(m => m.id === id);
    if (existingIdx >= 0) {
        state.materias[existingIdx] = materia;
        toast('Materia actualizada', 'success');
    } else {
        state.materias.push(materia);
        toast('Materia agregada', 'success');
    }

    guardarDatos();
    cerrarModalMateria();
    renderAll();
}

// === EDITAR / ELIMINAR ===
function editarMateria(id) {
    abrirModalMateria(id);
}

function eliminarMateria(id) {
    const materia = state.materias.find(m => m.id === id);
    if (!materia) return;

    const modal = document.getElementById('modalConfirm');
    document.getElementById('confirmMsg').textContent =
        `¿Estás seguro de eliminar "${materia.nombre}"? Esta acción no se puede deshacer.`;

    modal.classList.remove('hidden');

    const btnOk = document.getElementById('confirmOk');
    // Remove old listeners
    const newBtn = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtn, btnOk);

    newBtn.addEventListener('click', () => {
        state.materias = state.materias.filter(m => m.id !== id);
        // Remove from correlativas
        state.materias.forEach(m => {
            m.correlativas = (m.correlativas || []).filter(cId => cId !== id);
        });
        guardarDatos();
        renderAll();
        modal.classList.add('hidden');
        toast('Materia eliminada', 'info');
    });
}

// === FILTROS ===
function initFilters() {
    document.getElementById('filtroAnio').addEventListener('change', renderPlan);
    document.getElementById('filtroCuatri').addEventListener('change', renderPlan);
    document.getElementById('filtroEstado').addEventListener('change', renderMaterias);
    document.getElementById('buscarMateria').addEventListener('input', renderMaterias);
}

function updateFiltroAnios() {
    const select = document.getElementById('filtroAnio');
    const current = select.value;
    select.innerHTML = '<option value="">Todos los años</option>';
    for (let i = 1; i <= state.config.duracion; i++) {
        select.innerHTML += `<option value="${i}" ${current == i ? 'selected' : ''}>Año ${i}</option>`;
    }
}

// === CONFIGURACIÓN ===
function initConfig() {
    document.getElementById('btnGuardarConfig').addEventListener('click', guardarConfig);
    document.getElementById('btnExportar').addEventListener('click', exportarDatos);
    document.getElementById('btnImportar').addEventListener('change', importarDatos);
    document.getElementById('btnReset').addEventListener('click', resetDatos);
}

function loadConfigForm() {
    document.getElementById('configCarrera').value = state.config.carrera || '';
    document.getElementById('configUniversidad').value = state.config.universidad || '';
    document.getElementById('configDuracion').value = state.config.duracion || 5;
    document.getElementById('configNotaMin').value = state.config.notaMin || 4;
    document.getElementById('configNotaMax').value = state.config.notaMax || 10;
}

function guardarConfig() {
    state.config.carrera = document.getElementById('configCarrera').value.trim();
    state.config.universidad = document.getElementById('configUniversidad').value.trim();
    state.config.duracion = parseInt(document.getElementById('configDuracion').value) || 5;
    state.config.notaMin = parseInt(document.getElementById('configNotaMin').value) || 4;
    state.config.notaMax = parseInt(document.getElementById('configNotaMax').value) || 10;

    guardarDatos();
    renderAll();
    toast('Configuración guardada', 'success');
}

function exportarDatos() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi-carrera-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Datos exportados', 'success');
}

function importarDatos(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.config && data.materias) {
                state = data;
                guardarDatos();
                renderAll();
                toast('Datos importados correctamente', 'success');
            } else {
                toast('Archivo inválido', 'error');
            }
        } catch {
            toast('Error al leer el archivo', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function resetDatos() {
    const modal = document.getElementById('modalConfirm');
    document.getElementById('confirmMsg').textContent =
        '¿Estás seguro de borrar TODOS los datos? Esta acción no se puede deshacer.';

    modal.classList.remove('hidden');

    const btnOk = document.getElementById('confirmOk');
    const newBtn = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtn, btnOk);

    newBtn.addEventListener('click', () => {
        state = {
            config: { carrera: '', universidad: '', duracion: 5, notaMin: 4, notaMax: 10 },
            materias: [],
        };
        guardarDatos();
        renderAll();
        modal.classList.add('hidden');
        toast('Datos borrados', 'info');
    });
}

// === UTILIDADES ===
function generarId() {
    return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

function parseNota(val) {
    if (val === '' || val == null) return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// === TOAST NOTIFICATIONS ===
function toast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    container.appendChild(t);

    setTimeout(() => {
        t.remove();
        if (container.children.length === 0) container.remove();
    }, 3000);
}
