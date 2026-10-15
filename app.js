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
  USER_SALARY: 'hogardigital_user_salary',
  HAS_SEEDED_PRODS: 'hogardigital_seeded_prods_v2'
};

// ========================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ========================================================
const AppState = {
  products: [],
  supermarket: [],
  finances: [],
  userSalary: null,
  activeFinTab: 'fin-tab-scan',
  cameraStream: null,
  currentReceiptThumbnail: null,
  activeCategoryFilter: 'todos',
  searchQuery: '',
  charts: {
    incomeExpense: null,
    categoryExpenses: null,
    weeklyExpenses: null
  }
};

// ========================================================
// DATOS SEMILLA (PRODUCTOS Y SÚPER) - FINANZAS COMIENZA EN BLANCO
// ========================================================
function seedInitialData() {
  if (localStorage.getItem(STORAGE_KEYS.HAS_SEEDED_PRODS)) return;

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

  // Las finanzas NO se inicializan con datos predeterminados.
  // El usuario establece su monto/salario y sus movimientos mediante fotos a boletas o manual.
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(seedProducts));
  localStorage.setItem(STORAGE_KEYS.SUPERMARKET, JSON.stringify(seedSuper));
  localStorage.setItem(STORAGE_KEYS.HAS_SEEDED_PRODS, 'true');
}

// ========================================================
// PERSISTENCIA Y CARGA DE DATOS
// ========================================================
function loadData() {
  try {
    AppState.products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
    AppState.supermarket = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPERMARKET)) || [];
    
    // Cargar finanzas y limpiar si contenía semillas antiguas
    const storedFinances = JSON.parse(localStorage.getItem(STORAGE_KEYS.FINANCES)) || [];
    if (storedFinances.some(f => f.id === 'fin-1' && f.concept === 'Sueldo Mensual')) {
      AppState.finances = [];
      localStorage.setItem(STORAGE_KEYS.FINANCES, JSON.stringify([]));
    } else {
      AppState.finances = storedFinances;
    }

    // Cargar salario o monto mensual ingresado por el usuario
    const savedSalary = localStorage.getItem(STORAGE_KEYS.USER_SALARY);
    AppState.userSalary = savedSalary ? parseFloat(savedSalary) : null;
  } catch (err) {
    console.error('Error al cargar datos de LocalStorage:', err);
    AppState.products = [];
    AppState.supermarket = [];
    AppState.finances = [];
    AppState.userSalary = null;
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
  if (AppState.activeFinTab === 'fin-tab-summary') {
    renderFinancesDashboard();
  }
  renderScannedReceiptsPreview();
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

  // Al abrir Finanzas: abre por defecto en la pestaña de carga de monto y boletas
  // (Aparece limpia, sin ningún número predeterminado)
  if (viewId === 'view-finances') {
    switchFinanceSubTab('fin-tab-scan');
    renderSalaryUI();
    renderScannedReceiptsPreview();
  }

  // Al abrir Home: refrescar métricas y tarjeta de salario
  if (viewId === 'view-home') {
    updateQuickStats();
    renderSalaryUI();
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

  // Botón configurar salario en el Home
  document.getElementById('btn-home-salary-action')?.addEventListener('click', () => {
    openSalaryModal();
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
// 5. INTERFAZ 3: FINANZAS DEL HOGAR, SALARIO Y ESCÁNER DE BOLETAS
// ========================================================

/**
 * Control de Pestañas de Finanzas:
 * 1. fin-tab-scan: Cargar Monto & Boletas (Limpia, sin números predeterminados)
 * 2. fin-tab-summary: Resumen y Balance (Gráficos y Métricas)
 */
function switchFinanceSubTab(subTabId) {
  AppState.activeFinTab = subTabId;

  // Actualizar botones de sub-tabs
  document.querySelectorAll('.finance-tab-btn').forEach(btn => {
    if (btn.dataset.finTab === subTabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Alternar contenidos
  document.querySelectorAll('.finance-subtab-content').forEach(content => {
    if (content.id === subTabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Si se abre la pestaña de Resumen y Balance:
  if (subTabId === 'fin-tab-summary') {
    const emptyStateEl = document.getElementById('fin-empty-state');
    const dashboardEl = document.getElementById('fin-active-dashboard');

    // Si aún no hay movimientos cargados, no mostrar números
    if (AppState.finances.length === 0) {
      if (emptyStateEl) emptyStateEl.classList.remove('hidden');
      if (dashboardEl) dashboardEl.classList.add('hidden');
    } else {
      if (emptyStateEl) emptyStateEl.classList.add('hidden');
      if (dashboardEl) dashboardEl.classList.remove('hidden');
      renderFinancesDashboard();
    }
  }
}

/**
 * Gestión del Salario / Monto Ingresado por el Usuario
 */
function setUserSalary(amount) {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) return;

  AppState.userSalary = numericAmount;
  localStorage.setItem(STORAGE_KEYS.USER_SALARY, numericAmount.toString());

  // Sincronizar o registrar como ingreso principal en finanzas
  const existingSalaryIdx = AppState.finances.findIndex(f => f.category === 'Ingreso Salario' || f.id === 'fin-user-salary');
  const salaryObj = {
    id: 'fin-user-salary',
    type: 'ingreso',
    concept: 'Salario / Monto Base',
    amount: numericAmount,
    category: 'Ingreso Salario',
    date: new Date().toISOString().split('T')[0]
  };

  if (existingSalaryIdx >= 0) {
    AppState.finances[existingSalaryIdx] = salaryObj;
  } else {
    AppState.finances.unshift(salaryObj);
  }

  saveFinances();
  renderSalaryUI();
  showToast(`Monto de salario guardado: ${formatCurrency(numericAmount)}`, 'success');
}

function renderSalaryUI() {
  const elSavedBox = document.getElementById('salary-saved-status');
  const elSavedAmount = document.getElementById('saved-salary-amount');
  const elSalaryForm = document.getElementById('form-set-salary');
  const elInputFinance = document.getElementById('input-finance-salary');

  // Tarjeta en Finanzas
  if (AppState.userSalary && AppState.userSalary > 0) {
    if (elSavedBox) elSavedBox.classList.remove('hidden');
    if (elSavedAmount) elSavedAmount.textContent = formatCurrency(AppState.userSalary);
    if (elSalaryForm) elSalaryForm.classList.add('hidden');
  } else {
    if (elSavedBox) elSavedBox.classList.add('hidden');
    if (elSalaryForm) elSalaryForm.classList.remove('hidden');
  }

  // Tarjeta en Home
  const elHomeDisplay = document.getElementById('home-salary-display');
  const elHomeHelper = document.getElementById('home-salary-helper');
  const btnHomeAction = document.getElementById('btn-home-salary-action');

  if (elHomeDisplay && elHomeHelper) {
    if (AppState.userSalary && AppState.userSalary > 0) {
      elHomeDisplay.textContent = formatCurrency(AppState.userSalary);
      
      // Calcular gastos registrados
      const totalExpenses = AppState.finances
        .filter(t => t.type === 'gasto')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const remaining = AppState.userSalary - totalExpenses;

      elHomeHelper.textContent = `Gastos: ${formatCurrency(totalExpenses)} • Saldo: ${formatCurrency(remaining)}`;
      if (btnHomeAction) btnHomeAction.textContent = '✏️ Modificar';
    } else {
      elHomeDisplay.textContent = 'Salario: Sin configurar';
      elHomeHelper.textContent = 'Toca para ingresar tu salario o monto disponible.';
      if (btnHomeAction) btnHomeAction.textContent = '✏️ Configurar';
    }
  }

  if (elInputFinance && AppState.userSalary) {
    elInputFinance.value = AppState.userSalary;
  }
}

function openSalaryModal() {
  const modal = document.getElementById('modal-salary');
  const input = document.getElementById('home-salary-input');
  if (!modal) return;

  if (input) {
    input.value = AppState.userSalary || '';
  }
  modal.classList.remove('hidden');
}

/**
 * ========================================================
 * ESCÁNER DE BOLETAS Y CÁMARA (WEBRTC + FALLBACK NATIVO)
 * ========================================================
 */
let currentCameraFacing = 'environment';

function setupReceiptScanner() {
  const btnCamera = document.getElementById('btn-open-camera');
  const btnUpload = document.getElementById('btn-upload-receipt');
  const inputCamera = document.getElementById('input-receipt-camera');
  const inputGallery = document.getElementById('input-receipt-gallery');

  const modalCamera = document.getElementById('modal-live-camera');
  const btnCloseCam = document.getElementById('btn-close-camera');
  const btnSnapshot = document.getElementById('btn-take-snapshot');
  const btnSwitchCam = document.getElementById('btn-switch-camera');
  const btnFallbackGal = document.getElementById('btn-fallback-gallery');

  const btnCancelReceipt = document.getElementById('btn-cancel-receipt');
  const formConfirmReceipt = document.getElementById('form-confirm-receipt');

  // Botón Abrir Cámara
  btnCamera?.addEventListener('click', () => {
    openLiveCamera();
  });

  // Botón Subir desde Galería
  btnUpload?.addEventListener('click', () => {
    inputGallery?.click();
  });

  // Cerrar cámara en vivo
  btnCloseCam?.addEventListener('click', () => {
    closeLiveCamera();
  });

  // Cambiar cámara frontal / trasera
  btnSwitchCam?.addEventListener('click', () => {
    currentCameraFacing = currentCameraFacing === 'environment' ? 'user' : 'environment';
    startCameraStream();
  });

  // Desde el modal de cámara, abrir galería como alternativa
  btnFallbackGal?.addEventListener('click', () => {
    closeLiveCamera();
    inputGallery?.click();
  });

  // Disparador de snapshot
  btnSnapshot?.addEventListener('click', () => {
    takeCameraSnapshot();
  });

  // Input de cámara nativa (fallback móvil)
  inputCamera?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  });

  // Input de galería
  inputGallery?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  });

  // Descartar boleta escaneada
  btnCancelReceipt?.addEventListener('click', () => {
    const feedbackBox = document.getElementById('receipt-scan-feedback');
    if (feedbackBox) feedbackBox.classList.add('hidden');
    AppState.currentReceiptThumbnail = null;
  });

  // Confirmar y registrar movimiento detectado automáticamente
  formConfirmReceipt?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amountVal = parseFloat(document.getElementById('receipt-detected-amount').value);
    const conceptVal = document.getElementById('receipt-detected-concept').value.trim();
    const categoryVal = document.getElementById('receipt-detected-category').value;
    const dateVal = document.getElementById('receipt-detected-date').value;

    if (isNaN(amountVal) || amountVal <= 0 || !conceptVal || !dateVal) {
      alert('Por favor verifica los datos de la boleta.');
      return;
    }

    const newMovement = {
      id: 'fin-' + Date.now(),
      type: 'gasto',
      concept: conceptVal,
      amount: amountVal,
      category: categoryVal,
      date: dateVal,
      receiptImage: AppState.currentReceiptThumbnail || null
    };

    AppState.finances.unshift(newMovement);
    saveFinances();

    // Ocultar feedback y limpiar
    document.getElementById('receipt-scan-feedback')?.classList.add('hidden');
    AppState.currentReceiptThumbnail = null;

    showToast(`¡Movimiento registrado con éxito por ${formatCurrency(amountVal)}!`, 'success');
  });
}

function openLiveCamera() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const modalCamera = document.getElementById('modal-live-camera');
    if (modalCamera) modalCamera.classList.remove('hidden');
    startCameraStream();
  } else {
    // Fallback a captura de cámara estándar del navegador
    document.getElementById('input-receipt-camera')?.click();
  }
}

function startCameraStream() {
  stopCameraStream();

  const constraints = {
    video: {
      facingMode: { ideal: currentCameraFacing },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      AppState.cameraStream = stream;
      const video = document.getElementById('camera-video-stream');
      if (video) {
        video.srcObject = stream;
        video.play();
      }
    })
    .catch(err => {
      console.warn('No se pudo acceder a la cámara en vivo:', err);
      closeLiveCamera();
      // Abrir selector nativo de cámara
      document.getElementById('input-receipt-camera')?.click();
    });
}

function stopCameraStream() {
  if (AppState.cameraStream) {
    AppState.cameraStream.getTracks().forEach(t => t.stop());
    AppState.cameraStream = null;
  }
}

function closeLiveCamera() {
  stopCameraStream();
  const modalCamera = document.getElementById('modal-live-camera');
  if (modalCamera) modalCamera.classList.add('hidden');
}

function takeCameraSnapshot() {
  const video = document.getElementById('camera-video-stream');
  const canvas = document.getElementById('camera-snapshot-canvas');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  closeLiveCamera();
  processReceiptImage(dataUrl);
}

function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    processReceiptImage(e.target.result);
  };
  reader.readAsDataURL(file);
}

/**
 * Procesamiento inteligente de imagen de boleta (OCR + Extracción)
 */
function processReceiptImage(imageDataUrl) {
  const feedbackBox = document.getElementById('receipt-scan-feedback');
  const previewImg = document.getElementById('receipt-preview-img');
  const laserBeam = document.getElementById('scan-laser-beam');
  const statusIndicator = document.getElementById('scan-status-indicator');
  const statusText = document.getElementById('scan-status-text');
  const detectedDataBox = document.getElementById('detected-receipt-data');

  if (!feedbackBox || !previewImg) return;

  feedbackBox.classList.remove('hidden');
  previewImg.src = imageDataUrl;
  if (laserBeam) laserBeam.style.display = 'block';
  if (statusIndicator) statusIndicator.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Analizando ticket con detector inteligente...';
  if (detectedDataBox) detectedDataBox.classList.add('hidden');

  // 1. Redimensionar y generar thumbnail ligero (para no saturar LocalStorage)
  const img = new Image();
  img.onload = () => {
    const thumbCanvas = document.createElement('canvas');
    const maxThumbW = 360;
    const scale = Math.min(1, maxThumbW / img.width);
    thumbCanvas.width = img.width * scale;
    thumbCanvas.height = img.height * scale;
    const tCtx = thumbCanvas.getContext('2d');
    tCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
    AppState.currentReceiptThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.65);

    // 2. Ejecutar OCR con Tesseract.js (con salvaguarda de timeout)
    let ocrCompleted = false;

    // Timeout de 5.5s para no bloquear al usuario si el worker OCR tarda
    const ocrTimeout = setTimeout(() => {
      if (!ocrCompleted) {
        ocrCompleted = true;
        finishReceiptAnalysis('');
      }
    }, 5500);

    if (window.Tesseract && typeof Tesseract.recognize === 'function') {
      Tesseract.recognize(imageDataUrl, 'spa+eng', {
        logger: m => console.log('OCR progreso:', m.status, m.progress)
      })
      .then(result => {
        if (!ocrCompleted) {
          ocrCompleted = true;
          clearTimeout(ocrTimeout);
          finishReceiptAnalysis(result.data.text || '');
        }
      })
      .catch(err => {
        console.warn('Fallo en Tesseract OCR:', err);
        if (!ocrCompleted) {
          ocrCompleted = true;
          clearTimeout(ocrTimeout);
          finishReceiptAnalysis('');
        }
      });
    } else {
      clearTimeout(ocrTimeout);
      finishReceiptAnalysis('');
    }
  };
  img.src = imageDataUrl;
}

function finishReceiptAnalysis(ocrText) {
  const laserBeam = document.getElementById('scan-laser-beam');
  const statusIndicator = document.getElementById('scan-status-indicator');
  const detectedDataBox = document.getElementById('detected-receipt-data');

  if (laserBeam) laserBeam.style.display = 'none';
  if (statusIndicator) statusIndicator.classList.add('hidden');

  // Parsear texto de la boleta
  const parsed = parseReceiptText(ocrText);

  // Pre-llenar campos
  const inputAmount = document.getElementById('receipt-detected-amount');
  const inputConcept = document.getElementById('receipt-detected-concept');
  const selectCat = document.getElementById('receipt-detected-category');
  const inputDate = document.getElementById('receipt-detected-date');

  if (inputAmount) inputAmount.value = parsed.amount || '';
  if (inputConcept) inputConcept.value = parsed.concept || 'Boleta de compra';
  if (selectCat) selectCat.value = parsed.category || 'Supermercado';
  if (inputDate) inputDate.value = parsed.date || new Date().toISOString().split('T')[0];

  if (detectedDataBox) {
    detectedDataBox.classList.remove('hidden');
    inputAmount?.focus();
  }
}

/**
 * Parser inteligente de boletas: extrae montos, fechas, comercio y categoría
 */
function parseReceiptText(text) {
  const todayStr = new Date().toISOString().split('T')[0];
  if (!text || typeof text !== 'string') {
    return { amount: null, concept: 'Boleta de compra', category: 'Supermercado', date: todayStr };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let detectedAmount = null;
  let detectedDate = null;
  let detectedConcept = '';
  let detectedCategory = 'Supermercado';

  // 1. Detección de Monto Total
  // Buscar líneas que contengan TOTAL, MONTO, IMPORTE, PAGO, FINAL, etc.
  const totalKeywords = /(?:TOTAL|TOT|IMPORTE|MONTO|A PAGAR|PAGO|NETO|FINAL|TARJETA|PESOS|ARS|\$)/i;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (totalKeywords.test(line)) {
      const match = line.match(/\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})?)/);
      if (match) {
        let clean = match[1].replace(/\s/g, '');
        // Formato latino con coma decimal
        if (clean.includes('.') && clean.includes(',')) {
          clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (clean.includes(',')) {
          clean = clean.replace(',', '.');
        }
        const val = parseFloat(clean);
        if (!isNaN(val) && val > 0 && val < 5000000) {
          detectedAmount = val;
          break;
        }
      }
    }
  }

  // Si no se encontró por palabra clave, buscar el número más relevante del ticket
  if (!detectedAmount) {
    const allNumbers = [];
    lines.forEach(line => {
      const matches = line.match(/\$?\s*([0-9]{2,7}(?:[.,][0-9]{2})?)/g);
      if (matches) {
        matches.forEach(m => {
          let clean = m.replace(/[^\d.,]/g, '');
          if (clean.includes(',')) clean = clean.replace(',', '.');
          const val = parseFloat(clean);
          if (!isNaN(val) && val > 10 && val < 5000000) allNumbers.push(val);
        });
      }
    });
    if (allNumbers.length > 0) {
      detectedAmount = Math.max(...allNumbers);
    }
  }

  // 2. Detección de Fecha (dd/mm/yyyy o dd-mm-yyyy)
  const dateRegex = /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/;
  for (const line of lines) {
    const dMatch = line.match(dateRegex);
    if (dMatch) {
      const day = dMatch[1].padStart(2, '0');
      const month = dMatch[2].padStart(2, '0');
      let year = dMatch[3];
      if (year.length === 2) year = '20' + year;
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        detectedDate = `${year}-${month}-${day}`;
        break;
      }
    }
  }

  // 3. Detección de Comercio / Concepto
  const storeChains = [
    { name: 'Carrefour', cat: 'Supermercado' },
    { name: 'Coto', cat: 'Supermercado' },
    { name: 'Dia', cat: 'Supermercado' },
    { name: 'Disco', cat: 'Supermercado' },
    { name: 'Jumbo', cat: 'Supermercado' },
    { name: 'Vea', cat: 'Supermercado' },
    { name: 'ChangoMás', cat: 'Supermercado' },
    { name: 'Farmacity', cat: 'Farmacia' },
    { name: 'Dr. Ahorro', cat: 'Farmacia' },
    { name: 'Farmacia', cat: 'Farmacia' },
    { name: 'YPF', cat: 'Servicios' },
    { name: 'Shell', cat: 'Servicios' },
    { name: 'Axion', cat: 'Servicios' },
    { name: 'Panadería', cat: 'Supermercado' },
    { name: 'Verdulería', cat: 'Supermercado' },
    { name: 'Carnicería', cat: 'Supermercado' }
  ];

  for (const store of storeChains) {
    if (new RegExp(store.name, 'i').test(text)) {
      detectedConcept = store.name;
      detectedCategory = store.cat;
      break;
    }
  }

  // Si no se encontró cadena conocida, tomar la primera línea limpia del encabezado
  if (!detectedConcept) {
    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      const line = lines[i];
      if (line.length >= 3 && !/\d{5,}/.test(line) && !/CUIT|TICKET|FACTURA|BOLETA/i.test(line)) {
        detectedConcept = line.slice(0, 30);
        break;
      }
    }
    if (!detectedConcept) detectedConcept = 'Compra con boleta';
  }

  return {
    amount: detectedAmount,
    concept: detectedConcept,
    category: detectedCategory,
    date: detectedDate || todayStr
  };
}

/**
 * Renderizar vista previa de boletas escaneadas en fin-tab-scan
 */
function renderScannedReceiptsPreview() {
  const container = document.getElementById('scanned-receipts-grid');
  const countBadge = document.getElementById('scanned-count-badge');
  if (!container) return;

  const receiptItems = AppState.finances.filter(t => t.receiptImage);
  if (countBadge) countBadge.textContent = `${receiptItems.length} registradas`;

  if (receiptItems.length === 0) {
    container.innerHTML = `<p class="scanned-empty">Aún no has registrado boletas. ¡Saca tu primera foto arriba!</p>`;
    return;
  }

  container.innerHTML = receiptItems.slice(0, 8).map(item => `
    <div class="scanned-thumb-item" data-receipt-id="${item.id}" title="Ver comprobante de ${escapeHtml(item.concept)}">
      <img src="${item.receiptImage}" alt="Boleta ${escapeHtml(item.concept)}">
      <div class="scanned-thumb-info">
        <span class="scanned-thumb-concept">${escapeHtml(item.concept)}</span>
        <span class="scanned-thumb-amount">${formatCurrency(item.amount)}</span>
        <span class="scanned-thumb-date">${formatDisplayDate(item.date)}</span>
      </div>
    </div>
  `).join('');

  // Eventos de clic para abrir foto en modal grande
  container.querySelectorAll('.scanned-thumb-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.receiptId;
      const found = AppState.finances.find(t => t.id === id);
      if (found) openReceiptModal(found);
    });
  });
}

function openReceiptModal(item) {
  const modal = document.getElementById('modal-view-receipt');
  const img = document.getElementById('receipt-modal-img');
  const title = document.getElementById('receipt-modal-title');
  const info = document.getElementById('receipt-modal-info');
  if (!modal || !img) return;

  img.src = item.receiptImage || '';
  if (title) title.textContent = `Boleta: ${item.concept}`;
  if (info) {
    info.innerHTML = `
      Monto Total: <strong>${formatCurrency(item.amount)}</strong><br>
      Fecha de Compra: <strong>${formatDisplayDate(item.date)}</strong><br>
      Categoría Asignada: <strong>${escapeHtml(item.category)}</strong>
    `;
  }

  modal.classList.remove('hidden');
}

/**
 * Notificaciones Flotantes (Toasts)
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('app-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

/**
 * ========================================================
 * DASHBOARD Y GRÁFICOS (CHART.JS) - PESTAÑA RESUMEN
 * ========================================================
 */
function renderFinancesDashboard() {
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

  // 2. Gráficos Chart.js
  renderCharts(totalIncome, totalExpense);

  // 3. Lista de Movimientos
  renderTransactionsList();
}

function renderCharts(totalIncome, totalExpense) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js aún no está disponible');
    return;
  }

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
  // Gráfico 2: Gastos Mensuales por Categoría (PolarArea)
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
  // Gráfico 3: Gastos Semanales (Bar)
  // ----------------------------------------------------
  const daysLabels = [];
  const daysData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
    daysLabels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1));

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

  container.innerHTML = sorted.slice(0, 10).map(t => {
    const isIncome = t.type === 'ingreso';
    return `
      <li class="transaction-item">
        <div class="trans-desc-group">
          <span class="trans-title">${escapeHtml(t.concept)}</span>
          <span class="trans-date">${escapeHtml(t.category)} • ${formatDisplayDate(t.date)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="trans-amount ${isIncome ? 'income' : 'expense'}">
            ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
          </span>
          ${t.receiptImage ? `
            <button type="button" class="btn-subtle-edit btn-view-receipt-item" data-receipt-id="${t.id}" title="Ver foto de la boleta">
              🧾 Ver
            </button>
          ` : ''}
        </div>
      </li>
    `;
  }).join('');

  // Eventos para ver foto de boleta desde la lista
  container.querySelectorAll('.btn-view-receipt-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.receiptId;
      const found = AppState.finances.find(t => t.id === id);
      if (found) openReceiptModal(found);
    });
  });
}

function setupFinancesView() {
  // Pestañas Sub-navegación de Finanzas
  document.querySelectorAll('.finance-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.finTab;
      if (tabId) switchFinanceSubTab(tabId);
    });
  });

  // Botón "+ Manual" para registrar transacción manualmente
  document.getElementById('btn-open-add-finance')?.addEventListener('click', () => {
    openFinanceModal();
  });

  // Botón "Ir a Cargar Monto & Boletas" desde el estado vacío de resumen
  document.getElementById('btn-goto-scan-tab')?.addEventListener('click', () => {
    switchFinanceSubTab('fin-tab-scan');
  });

  // Formulario para guardar salario en Finanzas
  const formSalary = document.getElementById('form-set-salary');
  formSalary?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('input-finance-salary').value;
    setUserSalary(val);
  });

  // Botón "Cambiar" salario en Finanzas
  document.getElementById('btn-edit-saved-salary')?.addEventListener('click', () => {
    document.getElementById('salary-saved-status')?.classList.add('hidden');
    const form = document.getElementById('form-set-salary');
    if (form) {
      form.classList.remove('hidden');
      document.getElementById('input-finance-salary')?.focus();
    }
  });

  // Formulario Salario desde Modal de Home
  const formHomeSalary = document.getElementById('form-home-salary');
  formHomeSalary?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('home-salary-input').value;
    setUserSalary(val);
    closeModal('modal-salary');
  });

  // Formulario Transacción Manual
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
    showToast(`Movimiento registrado: ${concept} (${formatCurrency(amount)})`, 'success');
  });

  // Configurar Escáner de Boletas y Cámara
  setupReceiptScanner();
}

function openFinanceModal() {
  const modal = document.getElementById('modal-finance');
  const form = document.getElementById('form-finance');
  if (!modal || !form) return;

  form.reset();
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

    // Si el usuario no ha puesto salario ni hay movimientos, mostrar $0 sin números predeterminados
    if (AppState.finances.length === 0 && !AppState.userSalary) {
      elBalance.textContent = '$0';
      elBalance.style.color = 'var(--color-sienna)';
    } else {
      const netBalance = income - expense;
      elBalance.textContent = formatCurrency(netBalance);
      elBalance.style.color = netBalance >= 0 ? 'var(--color-sienna)' : 'var(--color-danger)';
    }
  }

  renderSalaryUI();
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
  renderSalaryUI();
  renderScannedReceiptsPreview();
  updateQuickStats();

  registerServiceWorker();
});
