/**
 * ========================================================
 * HOGAR DIGITAL - LÓGICA DE APLICACIÓN (ES6+)
 * Control SPA, Animación de Splash, Almacenamiento Local,
 * Detección de Vencimientos y Métricas con Chart.js
 * ========================================================
 */

// Claves de Almacenamiento en LocalStorage
const STORAGE_KEYS = {
  PRODUCTS: 'hogardigital_products',
  SUPERMARKET: 'hogardigital_supermarket',
  FINANCES: 'hogardigital_finances',
  HAS_SEEDED: 'hogardigital_seeded_v1'
};

// ========================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ========================================================
const AppState = {
  products: [],
  supermarket: [],
  finances: [],
  activeCategoryFilter: 'todos',
  searchQuery: '',
  charts: {
    incomeExpense: null,
    categoryExpenses: null,
    weeklyExpenses: null
  }
};

// ========================================================
// DATOS SEMILLA (DEMO REALISTA AL PRIMER INICIO)
// ========================================================
function seedInitialData() {
  if (localStorage.getItem(STORAGE_KEYS.HAS_SEEDED)) return;

  const today = new Date();
  const formatOffsetDate = (days) => {
    const d = new Date();
    d.setDate(today.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // 1. Productos del Hogar con algunos próximos a vencer (≤ 3 días)
  const seedProducts = [
    {
      id: 'prod-1',
      name: 'Leche Descremada 1L',
      qty: 2,
      unit: 'litros',
      category: 'Alimentos',
      expiryDate: formatOffsetDate(2) // Vence en 2 días -> ALERTA
    },
    {
      id: 'prod-2',
      name: 'Yogurt Griego Frutilla',
      qty: 1,
      unit: 'unidades',
      category: 'Alimentos',
      expiryDate: formatOffsetDate(1) // Vence mañana -> ALERTA
    },
    {
      id: 'prod-3',
      name: 'Paracetamol 500mg',
      qty: 10,
      unit: 'unidades',
      category: 'Farmacia',
      expiryDate: formatOffsetDate(180) // En buen estado
    },
    {
      id: 'prod-4',
      name: 'Detergente Líquido Ropa',
      qty: 1,
      unit: 'litros',
      category: 'Limpieza',
      expiryDate: formatOffsetDate(90) // En buen estado
    },
    {
      id: 'prod-5',
      name: 'Queso Crema Untable',
      qty: 1,
      unit: 'unidades',
      category: 'Alimentos',
      expiryDate: formatOffsetDate(-1) // Ya venció ayer -> ALERTA
    }
  ];

  // 2. Lista de Supermercado
  const seedSuper = [
    { id: 'sup-1', name: 'Huevos de campo x12', category: 'Alimentos', completed: false },
    { id: 'sup-2', name: 'Papel higiénico 4 rollos', category: 'Limpieza', completed: true },
    { id: 'sup-3', name: 'Shampoo Anticaída', category: 'Limpieza', completed: false },
    { id: 'sup-4', name: 'Alcohol en gel', category: 'Farmacia', completed: false }
  ];

  // 3. Transacciones Financieras
  const seedFinances = [
    { id: 'fin-1', type: 'ingreso', concept: 'Sueldo Mensual', amount: 320000, category: 'Ingreso Salario', date: formatOffsetDate(-5) },
    { id: 'fin-2', type: 'gasto', concept: 'Compra semanal súper', amount: 48500, category: 'Supermercado', date: formatOffsetDate(-4) },
    { id: 'fin-3', type: 'gasto', concept: 'Servicio de Internet y WiFi', amount: 15400, category: 'Servicios', date: formatOffsetDate(-3) },
    { id: 'fin-4', type: 'gasto', concept: 'Medicamentos y Botiquín', amount: 9200, category: 'Farmacia', date: formatOffsetDate(-2) },
    { id: 'fin-5', type: 'gasto', concept: 'Artículos de Limpieza y Hogar', amount: 12800, category: 'Hogar', date: formatOffsetDate(-1) }
  ];

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(seedProducts));
  localStorage.setItem(STORAGE_KEYS.SUPERMARKET, JSON.stringify(seedSuper));
  localStorage.setItem(STORAGE_KEYS.FINANCES, JSON.stringify(seedFinances));
  localStorage.setItem(STORAGE_KEYS.HAS_SEEDED, 'true');
}

// ========================================================
// PERSISTENCIA Y CARGA DE DATOS
// ========================================================
function loadData() {
  try {
    AppState.products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
    AppState.supermarket = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPERMARKET)) || [];
    AppState.finances = JSON.parse(localStorage.getItem(STORAGE_KEYS.FINANCES)) || [];
  } catch (err) {
    console.error('Error al cargar datos de LocalStorage:', err);
    AppState.products = [];
    AppState.supermarket = [];
    AppState.finances = [];
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(AppState.products));
  updateExpiringAlerts();
  renderProducts();
  updateQuickStats();
}

function saveSupermarket() {
  localStorage.setItem(STORAGE_KEYS.SUPERMARKET, JSON.stringify(AppState.supermarket));
  renderSupermarket();
  updateQuickStats();
}

function saveFinances() {
  localStorage.setItem(STORAGE_KEYS.FINANCES, JSON.stringify(AppState.finances));
  renderFinancesDashboard();
  updateQuickStats();
}

// ========================================================
// 1. ANIMACIÓN DE INICIO / SPLASH SCREEN
// ========================================================
function initSplashScreen() {
  const splashScreen = document.getElementById('splash-screen');
  const splashLoader = document.getElementById('splash-loader');
  const splashTextBox = document.getElementById('splash-text-box');

  if (!splashScreen || !splashLoader || !splashTextBox) return;

  // Paso 1 & 2: Muestra el logo y el spinner girando durante exactamente 2.5 segundos
  setTimeout(() => {
    // Transcurridos 2.5s: Desvanecer el círculo de carga
    splashLoader.classList.add('fade-out');

    // Aparecen deslizándose hacia arriba ("slide-up") las palabras:
    // "HOGAR DIGITAL" y "Tu Asistente de Casa"
    setTimeout(() => {
      splashTextBox.classList.add('slide-up');

      // El logo completo armado se mantiene visible brevemente (1.2s)
      setTimeout(() => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
          splashScreen.remove(); // Remueve el elemento del DOM tras el fade
        }, 600);
      }, 1300);

    }, 250);

  }, 2500);
}

// ========================================================
// 2. NAVEGACIÓN SPA
// ========================================================
function navigateToView(viewId) {
  const views = document.querySelectorAll('.spa-view');
  views.forEach(v => v.classList.remove('active-view'));

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active-view');
  }

  // Actualizar tabs inferiores
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    if (tab.dataset.target === viewId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Si se entra a la vista de Finanzas, redimensionar gráficos
  if (viewId === 'view-finances') {
    renderFinancesDashboard();
  }

  // Scroll suave arriba
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
  // Cuadro 1 de Cabecera: Casita (Home)
  document.getElementById('btn-header-home')?.addEventListener('click', () => {
    navigateToView('view-home');
  });

  // Título central
  document.getElementById('btn-brand-home')?.addEventListener('click', () => {
    navigateToView('view-home');
  });

  // Cuadro 2 de Cabecera: Campanita de Notificaciones
  document.getElementById('btn-header-bell')?.addEventListener('click', () => {
    openAlertsModal();
  });

  // Botones principales del Home
  document.getElementById('nav-btn-products')?.addEventListener('click', () => {
    navigateToView('view-products');
  });

  document.getElementById('nav-btn-supermarket')?.addEventListener('click', () => {
    navigateToView('view-supermarket');
  });

  document.getElementById('nav-btn-finances')?.addEventListener('click', () => {
    navigateToView('view-finances');
  });

  // Banner de alerta en el Home
  document.getElementById('btn-goto-expiring')?.addEventListener('click', () => {
    navigateToView('view-products');
  });

  // Tabs de navegación inferior
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      if (target) navigateToView(target);
    });
  });
}

// ========================================================
// 3. INTERFAZ 1: PRODUCTOS DEL HOGAR (INVENTARIO Y VENCIMIENTOS)
// ========================================================

/**
 * Calcula los días que faltan para el vencimiento.
 * Retorna número entero (negativo si ya venció).
 */
function getDaysUntilExpiry(dateString) {
  if (!dateString) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(dateString + 'T00:00:00');
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatExpiryBadge(days) {
  if (days < 0) {
    return { text: `Venció hace ${Math.abs(days)} día(s)`, isExpiring: true };
  } else if (days === 0) {
    return { text: '¡Vence hoy!', isExpiring: true };
  } else if (days <= 3) {
    return { text: `Vence en ${days} día(s)`, isExpiring: true };
  } else {
    return { text: `Vence en ${days} días`, isExpiring: false };
  }
}

/**
 * LÓGICA JS REQUERIDA: Si un producto vence en menos de 3 días,
 * resalta la tarjeta en rojo y activa un indicador (badge) en la campanita.
 */
function updateExpiringAlerts() {
  const expiringItems = AppState.products.filter(p => {
    const days = getDaysUntilExpiry(p.expiryDate);
    return days <= 3;
  });

  const count = expiringItems.length;
  const badge = document.getElementById('bell-badge');
  const homeBanner = document.getElementById('home-alert-banner');
  const homeCount = document.getElementById('home-alert-count');

  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  if (homeBanner && homeCount) {
    if (count > 0) {
      homeCount.textContent = `${count} producto${count > 1 ? 's' : ''}`;
      homeBanner.classList.remove('hidden');
    } else {
      homeBanner.classList.add('hidden');
    }
  }

  return expiringItems;
}

function renderProducts() {
  const container = document.getElementById('products-list-container');
  if (!container) return;

  const filtered = AppState.products.filter(item => {
    const matchesCategory = AppState.activeCategoryFilter === 'todos' || item.category === AppState.activeCategoryFilter;
    const matchesSearch = !AppState.searchQuery || item.name.toLowerCase().includes(AppState.searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p class="empty-state-text">No hay productos en esta categoría.</p>
        <small>Toca el botón "+ Nuevo" para agregar uno.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const days = getDaysUntilExpiry(item.expiryDate);
    const { text, isExpiring } = formatExpiryBadge(days);

    return `
      <article class="product-card ${isExpiring ? 'expiring-alert' : ''}" data-id="${item.id}">
        <div class="product-info-main">
          <div class="product-title-row">
            <span class="product-name">${escapeHtml(item.name)}</span>
            <span class="product-badge-cat">${escapeHtml(item.category)}</span>
          </div>
          <div class="product-meta">
            <span><strong>Stock:</strong> ${item.qty} ${escapeHtml(item.unit || 'unidades')}</span>
            <span class="product-expiry">
              ${isExpiring ? '⚠️' : '📅'} ${text} (${formatDisplayDate(item.expiryDate)})
            </span>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn-icon-action edit-prod-btn" data-id="${item.id}" title="Editar producto">✏️</button>
          <button class="btn-icon-action delete delete-prod-btn" data-id="${item.id}" title="Eliminar">🗑️</button>
        </div>
      </article>
    `;
  }).join('');

  // Event Listeners para editar y eliminar
  container.querySelectorAll('.edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', () => openProductModal(btn.dataset.id));
  });

  container.querySelectorAll('.delete-prod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Deseas eliminar este producto del inventario?')) {
        AppState.products = AppState.products.filter(p => p.id !== btn.dataset.id);
        saveProducts();
      }
    });
  });
}

function setupProductsView() {
  // Botón "+ Nuevo"
  document.getElementById('btn-open-add-product')?.addEventListener('click', () => {
    openProductModal();
  });

  // Filtro por Chips
  const filterChips = document.querySelectorAll('#prod-category-filters .chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      AppState.activeCategoryFilter = chip.dataset.category;
      renderProducts();
    });
  });

  // Búsqueda
  document.getElementById('input-search-products')?.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value.trim();
    renderProducts();
  });

  // Formulario Producto
  const form = document.getElementById('form-product');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-form-id').value;
    const name = document.getElementById('prod-form-name').value.trim();
    const qty = parseInt(document.getElementById('prod-form-qty').value, 10) || 1;
    const unit = document.getElementById('prod-form-unit').value;
    const category = document.getElementById('prod-form-category').value;
    const expiryDate = document.getElementById('prod-form-expiry').value;

    if (!name || !expiryDate) return;

    if (id) {
      // Editar existente
      const index = AppState.products.findIndex(p => p.id === id);
      if (index !== -1) {
        AppState.products[index] = { ...AppState.products[index], name, qty, unit, category, expiryDate };
      }
    } else {
      // Crear nuevo
      const newProd = {
        id: 'prod-' + Date.now(),
        name,
        qty,
        unit,
        category,
        expiryDate
      };
      AppState.products.unshift(newProd);
    }

    saveProducts();
    closeModal('modal-product');
    form.reset();
  });
}

function openProductModal(prodId = null) {
  const modal = document.getElementById('modal-product');
  const title = document.getElementById('modal-product-title');
  const form = document.getElementById('form-product');
  if (!modal || !form) return;

  form.reset();

  if (prodId) {
    const prod = AppState.products.find(p => p.id === prodId);
    if (prod) {
      title.textContent = 'Editar Producto';
      document.getElementById('prod-form-id').value = prod.id;
      document.getElementById('prod-form-name').value = prod.name;
      document.getElementById('prod-form-qty').value = prod.qty;
      document.getElementById('prod-form-unit').value = prod.unit || 'unidades';
      document.getElementById('prod-form-category').value = prod.category;
      document.getElementById('prod-form-expiry').value = prod.expiryDate;
    }
  } else {
    title.textContent = 'Nuevo Producto';
    document.getElementById('prod-form-id').value = '';
    // Fecha predeterminada: 7 días en el futuro
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    document.getElementById('prod-form-expiry').value = defaultDate.toISOString().split('T')[0];
  }

  modal.classList.remove('hidden');
}

// ========================================================
// 4. INTERFAZ 2: SUPERMERCADO (LISTA DE COMPRAS)
// ========================================================
function renderSupermarket() {
  const listEl = document.getElementById('supermarket-checklist');
  const fillBar = document.getElementById('shop-progress-fill');
  const percentText = document.getElementById('shop-progress-percent');
  if (!listEl) return;

  if (AppState.supermarket.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <p class="empty-state-text">Tu lista de compras está vacía.</p>
        <small>Agrega productos arriba o importa los vencidos de tu inventario.</small>
      </div>
    `;
    if (fillBar) fillBar.style.width = '0%';
    if (percentText) percentText.textContent = '0%';
    return;
  }

  // Actualizar barra de progreso
  const total = AppState.supermarket.length;
  const completed = AppState.supermarket.filter(i => i.completed).length;
  const percentage = Math.round((completed / total) * 100);

  if (fillBar) fillBar.style.width = `${percentage}%`;
  if (percentText) percentText.textContent = `${percentage}% (${completed}/${total})`;

  listEl.innerHTML = AppState.supermarket.map(item => `
    <li class="checklist-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
      <div class="item-left">
        <input type="checkbox" class="custom-checkbox item-chk" data-id="${item.id}" ${item.completed ? 'checked' : ''} aria-label="Marcar ${escapeHtml(item.name)} como comprado">
        <div>
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="item-cat-tag">${escapeHtml(item.category || 'Varios')}</span>
        </div>
      </div>
      <button class="btn-icon-action delete delete-shop-btn" data-id="${item.id}" title="Eliminar de la lista">✕</button>
    </li>
  `).join('');

  // Checkbox toggle
  listEl.querySelectorAll('.item-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = chk.dataset.id;
      const target = AppState.supermarket.find(i => i.id === id);
      if (target) {
        target.completed = chk.checked;
        saveSupermarket();
      }
    });
  });

  // Eliminar item
  listEl.querySelectorAll('.delete-shop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.supermarket = AppState.supermarket.filter(i => i.id !== btn.dataset.id);
      saveSupermarket();
    });
  });
}

function setupSupermarketView() {
  // Formulario rápido
  const quickForm = document.getElementById('form-quick-add-shop');
  quickForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('shop-input-item');
    const select = document.getElementById('shop-select-cat');
    const name = input.value.trim();
    if (!name) return;

    AppState.supermarket.unshift({
      id: 'sup-' + Date.now(),
      name,
      category: select.value || 'Varios',
      completed: false
    });

    saveSupermarket();
    input.value = '';
    input.focus();
  });

  // BOTÓN REQUERIDO: Importar automáticamente productos que están vencidos en Interfaz 1
  document.getElementById('btn-import-expired')?.addEventListener('click', () => {
    const expiringItems = AppState.products.filter(p => {
      const days = getDaysUntilExpiry(p.expiryDate);
      return days <= 3 || p.qty === 0;
    });

    if (expiringItems.length === 0) {
      alert('¡Excelente noticia! No tienes productos vencidos ni por vencer en los próximos 3 días.');
      return;
    }

    let addedCount = 0;
    expiringItems.forEach(item => {
      // Verificar si ya existe en la lista de compras pendiente
      const alreadyInList = AppState.supermarket.some(s => 
        s.name.toLowerCase() === item.name.toLowerCase() && !s.completed
      );

      if (!alreadyInList) {
        AppState.supermarket.unshift({
          id: 'sup-imp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          name: item.name,
          category: item.category || 'Alimentos',
          completed: false
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      saveSupermarket();
      alert(`¡Se importaron ${addedCount} producto(s) vencido(s) o por vencer a tu lista de compras!`);
    } else {
      alert('Los productos vencidos ya están registrados en tu lista de compras.');
    }
  });

  // Limpiar completados
  document.getElementById('btn-clear-completed')?.addEventListener('click', () => {
    const initialLen = AppState.supermarket.length;
    AppState.supermarket = AppState.supermarket.filter(i => !i.completed);
    if (AppState.supermarket.length < initialLen) {
      saveSupermarket();
    }
  });
}

// ========================================================
// 5. INTERFAZ 3: FINANZAS (DASHBOARD & CHART.JS)
// ========================================================
function renderFinancesDashboard() {
  // 1. Calcular KPIs
  let totalIncome = 0;
  let totalExpense = 0;

  AppState.finances.forEach(t => {
    const val = Number(t.amount) || 0;
    if (t.type === 'ingreso') {
      totalIncome += val;
    } else {
      totalExpense += val;
    }
  });

  const balance = totalIncome - totalExpense;

  const elIncome = document.getElementById('kpi-total-income');
  const elExpense = document.getElementById('kpi-total-expense');
  const elBalance = document.getElementById('kpi-balance');

  if (elIncome) elIncome.textContent = formatCurrency(totalIncome);
  if (elExpense) elExpense.textContent = formatCurrency(totalExpense);
  if (elBalance) {
    elBalance.textContent = formatCurrency(balance);
    elBalance.style.color = balance >= 0 ? 'var(--color-sienna)' : 'var(--color-danger)';
  }

  // 2. Renderizar Gráficos Chart.js
  renderCharts(totalIncome, totalExpense);

  // 3. Renderizar Lista de Movimientos
  renderTransactionsList();
}

function renderCharts(totalIncome, totalExpense) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js aún no está disponible');
    return;
  }

  // Paleta de Colores solicitada: #E35336 (Coral), #F4A460 (Durazno), #A0522D (Sienna)
  const PALETTE = {
    coral: '#E35336',
    peach: '#F4A460',
    sienna: '#A0522D',
    siennaDark: '#7A3D22',
    cream: '#F5F5DC',
    success: '#2E7D32'
  };

  // ----------------------------------------------------
  // Gráfico 1: Ingresos vs. Gastos (Doughnut)
  // ----------------------------------------------------
  const ctx1 = document.getElementById('chart-income-expense')?.getContext('2d');
  if (ctx1) {
    if (AppState.charts.incomeExpense) {
      AppState.charts.incomeExpense.destroy();
    }

    const hasData = (totalIncome + totalExpense) > 0;
    AppState.charts.incomeExpense = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{
          data: hasData ? [totalIncome, totalExpense] : [1, 0],
          backgroundColor: hasData ? [PALETTE.success, PALETTE.coral] : ['#E0E0E0', '#BDBDBD'],
          borderWidth: 2,
          borderColor: '#FFFDF8'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: "'Fredoka', sans-serif", size: 12, weight: 'bold' },
              color: '#1E1E1E'
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${formatCurrency(item.raw)}`
            }
          }
        }
      }
    });
  }

  // ----------------------------------------------------
  // Gráfico 2: Gastos Mensuales por Categoría (Doughnut / Pie)
  // ----------------------------------------------------
  const categoryTotals = {};
  AppState.finances
    .filter(t => t.type === 'gasto')
    .forEach(t => {
      const cat = t.category || 'Otros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
    });

  const catLabels = Object.keys(categoryTotals);
  const catData = Object.values(categoryTotals);

  const ctx2 = document.getElementById('chart-category-expenses')?.getContext('2d');
  if (ctx2) {
    if (AppState.charts.categoryExpenses) {
      AppState.charts.categoryExpenses.destroy();
    }

    const colorsList = [PALETTE.coral, PALETTE.peach, PALETTE.sienna, PALETTE.siennaDark, '#D87A56', '#C45D3E'];

    AppState.charts.categoryExpenses = new Chart(ctx2, {
      type: 'polarArea',
      data: {
        labels: catLabels.length ? catLabels : ['Sin Gastos'],
        datasets: [{
          data: catData.length ? catData : [1],
          backgroundColor: colorsList.map(c => c + 'CC'),
          borderColor: colorsList,
          borderWidth: 1.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: "'Fredoka', sans-serif", size: 11 },
              color: '#1E1E1E'
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${formatCurrency(item.raw)}`
            }
          }
        },
        scales: {
          r: {
            ticks: { display: false },
            grid: { color: 'rgba(160, 82, 45, 0.15)' }
          }
        }
      }
    });
  }

  // ----------------------------------------------------
  // Gráfico 3: Gastos Semanales (Evolución del Tiempo)
  // ----------------------------------------------------
  // Agrupar los últimos 7 días
  const daysLabels = [];
  const daysData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
    daysLabels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1));

    // Sumar gastos de este día
    const dayExpense = AppState.finances
      .filter(t => t.type === 'gasto' && t.date === dateStr)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    daysData.push(dayExpense);
  }

  const ctx3 = document.getElementById('chart-weekly-expenses')?.getContext('2d');
  if (ctx3) {
    if (AppState.charts.weeklyExpenses) {
      AppState.charts.weeklyExpenses.destroy();
    }

    AppState.charts.weeklyExpenses = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: daysLabels,
        datasets: [{
          label: 'Gasto Diario',
          data: daysData,
          backgroundColor: PALETTE.peach,
          hoverBackgroundColor: PALETTE.coral,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: PALETTE.sienna
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` Gasto: ${formatCurrency(item.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Fredoka', sans-serif" } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(160, 82, 45, 0.1)' },
            ticks: {
              font: { family: "'Fredoka', sans-serif" },
              callback: (v) => '$' + v
            }
          }
        }
      }
    });
  }
}

function renderTransactionsList() {
  const container = document.getElementById('transactions-list');
  if (!container) return;

  if (AppState.finances.length === 0) {
    container.innerHTML = `
      <li class="empty-state">
        <p class="empty-state-text">No hay movimientos registrados.</p>
      </li>
    `;
    return;
  }

  // Ordenar por fecha descendente
  const sorted = [...AppState.finances].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = sorted.slice(0, 8).map(t => {
    const isIncome = t.type === 'ingreso';
    return `
      <li class="transaction-item">
        <div class="trans-desc-group">
          <span class="trans-title">${escapeHtml(t.concept)}</span>
          <span class="trans-date">${escapeHtml(t.category)} • ${formatDisplayDate(t.date)}</span>
        </div>
        <span class="trans-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </span>
      </li>
    `;
  }).join('');
}

function setupFinancesView() {
  // Botón "+ Transacción"
  document.getElementById('btn-open-add-finance')?.addEventListener('click', () => {
    openFinanceModal();
  });

  // Formulario Transacción
  const form = document.getElementById('form-finance');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = form.querySelector('input[name="finance-type"]:checked').value;
    const concept = document.getElementById('fin-form-concept').value.trim();
    const amount = parseFloat(document.getElementById('fin-form-amount').value);
    const date = document.getElementById('fin-form-date').value;
    const category = document.getElementById('fin-form-category').value;

    if (!concept || isNaN(amount) || amount <= 0 || !date) return;

    const newTrans = {
      id: 'fin-' + Date.now(),
      type,
      concept,
      amount,
      category,
      date
    };

    AppState.finances.unshift(newTrans);
    saveFinances();
    closeModal('modal-finance');
    form.reset();
  });
}

function openFinanceModal() {
  const modal = document.getElementById('modal-finance');
  const form = document.getElementById('form-finance');
  if (!modal || !form) return;

  form.reset();
  // Fecha actual por defecto
  document.getElementById('fin-form-date').value = new Date().toISOString().split('T')[0];
  modal.classList.remove('hidden');
}

// ========================================================
// 6. MODALES Y NOTIFICACIONES
// ========================================================
function setupModals() {
  // Botones de cierre [data-close="modal-id"]
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      closeModal(modalId);
    });
  });

  // Cerrar al hacer clic en el backdrop
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function openAlertsModal() {
  const modal = document.getElementById('modal-alerts');
  const list = document.getElementById('alerts-modal-list');
  if (!modal || !list) return;

  const expiringItems = updateExpiringAlerts();

  if (expiringItems.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 16px 0;">
        <span style="font-size: 2rem;">✅</span>
        <p style="margin-top: 8px; font-weight: 700; color: var(--color-success);">¡Todo al día!</p>
        <p style="font-size: 0.85rem;">No tienes productos vencidos ni por vencer.</p>
      </div>
    `;
  } else {
    list.innerHTML = expiringItems.map(item => {
      const days = getDaysUntilExpiry(item.expiryDate);
      const { text } = formatExpiryBadge(days);
      return `
        <li class="alert-item-row">
          <div>
            <div class="alert-item-name">${escapeHtml(item.name)}</div>
            <small style="color: var(--color-text-muted);">${escapeHtml(item.category)} • Cantidad: ${item.qty}</small>
          </div>
          <span class="alert-item-days">${text}</span>
        </li>
      `;
    }).join('');
  }

  modal.classList.remove('hidden');
}

// ========================================================
// 7. ACTUALIZACIÓN RÁPIDA DE MÉTRICAS EN HOME
// ========================================================
function updateQuickStats() {
  const elProdCount = document.getElementById('quick-prod-count');
  const elShopCount = document.getElementById('quick-shop-count');
  const elBalance = document.getElementById('quick-balance');

  if (elProdCount) elProdCount.textContent = AppState.products.length;
  if (elShopCount) {
    const pendingShop = AppState.supermarket.filter(i => !i.completed).length;
    elShopCount.textContent = pendingShop;
  }
  if (elBalance) {
    let income = 0;
    let expense = 0;
    AppState.finances.forEach(t => {
      if (t.type === 'ingreso') income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    });
    elBalance.textContent = formatCurrency(income - expense);
  }
}

// ========================================================
// HELPERS Y UTILIDADES
// ========================================================
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ========================================================
// REGISTRO DE SERVICE WORKER (PWA)
// ========================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
        .catch(err => console.log('Fallo en Service Worker (esperado en file://):', err));
    });
  }
}

// ========================================================
// INICIALIZACIÓN GLOBAL DE LA APLICACIÓN
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  seedInitialData();
  loadData();

  initSplashScreen();
  setupNavigation();
  setupProductsView();
  setupSupermarketView();
  setupFinancesView();
  setupModals();

  // Render inicial
  updateExpiringAlerts();
  renderProducts();
  renderSupermarket();
  renderFinancesDashboard();
  updateQuickStats();

  registerServiceWorker();
});
