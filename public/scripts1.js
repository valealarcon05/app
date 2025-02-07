const loadTableData = async (url, tableId, actionCallback) => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        const tableBody = document.querySelector(`${tableId} tbody`);
        tableBody.innerHTML = data.map(actionCallback).join('');
    } catch (error) {
        console.error(`Error al cargar datos para ${tableId}:`, error);
    }
};
// Función genérica para asignar eventos a botones de eliminación
const setupDeleteButtons = (tableId, deleteCallback) => {
    document.querySelectorAll(`${tableId} .delete-button`).forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id || e.target.closest('button').dataset.id;
            if (id && confirm('¿Estás seguro de eliminar este elemento?')) {
                await deleteCallback(id);
            }
        });
    });
};
// Función genérica para eliminar un elemento
const deleteItem = async (url, id, tableId) => {
    if (!id) {
        console.error('ID inválido para eliminar.');
        return;
    }
    if (confirm('¿Estás seguro de eliminar este elemento?')) {
    try {
        const response = await fetch(`${url}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar el elemento.');
        alert('Elemento eliminado correctamente.');
        const row = document.querySelector(`${tableId} .delete-button[data-id="${id}"]`).closest('tr');
        if (row) row.remove();
    } catch (error) {
        console.error('Error al eliminar el elemento:', error);
    }
}
};
// Inicializar tablas y acciones
const initTables = async () => {
    // Cargar y configurar tabla de productos
    await loadTableData('/api/admin/productos', '#adminProductsTable', (row) => `
        <tr>
            <td>${row.nombre}</td>
            <td>${row.precio_unitario.toFixed(2)}</td>
            <td>${row.precio_venta.toFixed(2)}</td>
            <td>${row.cantidad_disponible}</td>
            <td>${row.unidad}</td>
            <td>
                <button class="delete-button" data-id="${row.id}">Eliminar</button>
            </td>
        </tr>
    `);
    setupDeleteButtons('#adminProductsTable', (id) => deleteItem('/api/productos', id, '#adminProductsTable'));

    // Cargar y configurar tabla de materia prima
    await loadTableData('/api/admin/materia-prima', '#adminRawMaterialTable', (row) => `
        <tr>
            <td>${row.nombre}</td>
            <td>${row.cantidad}</td>
            <td>${row.unidad}</td>
            <td>${row.precio_compra}</td>
            <td>${row.fecha_hora}</td>
            <td>
                <button class="delete-button" data-id="${row.id}">Eliminar</button>
            </td>
        </tr>
    `);
    setupDeleteButtons('#adminRawMaterialTable', (id) => deleteItem('/api/materia-prima', id, '#adminRawMaterialTable'));

    // Cargar y configurar tabla de empleados
    await loadTableData('/api/admin/empleados', '#adminEmployeesTable', (row) => `
        <tr>
            <td>${row.nombre}</td>
            <td>${row.sector || 'N/A'}</td>
            <td>
                <button class="delete-button" data-id="${row.id}">Eliminar</button>
            </td>
        </tr>
    `);
    setupDeleteButtons('#adminEmployeesTable', (id) => deleteItem('/api/empleados', id, '#adminEmployeesTable'));
};

const loadCharts = async () => {
    // Gráfico de barras: ingresos por sector por semana
    const weeklyRevenueResponse = await fetch('/api/ingresos-semanales');
    const weeklyRevenueData = await weeklyRevenueResponse.json();

    const sectors = [...new Set(weeklyRevenueData.map(row => row.sector))];
    const weeks = [...new Set(weeklyRevenueData.map(row => row.semana))];

    const datasets = sectors.map(sector => {
        const data = weeks.map(week => {
            const row = weeklyRevenueData.find(r => r.sector === sector && r.semana === week);
            return row ? row.ingresos : 0;
        });
        return {
            label: sector,
            data: data,
            backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`,
            borderColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
            borderWidth: 1,
        };
    });

    new Chart(document.getElementById('weeklyRevenueChart'), {
        type: 'bar',
        data: {
            labels: weeks,
            datasets: datasets,
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Ingresos por Semana (por Sector)',
                },
            },
        },
    });

    // Gráfico de tortas: producido vs vendido
    const performanceResponse = await fetch('/api/rendimiento');
    const performanceData = await performanceResponse.json();

    new Chart(document.getElementById('productionSalesChart'), {
        type: 'pie',
        data: {
            labels: ['Producido', 'Vendido'],
            datasets: [{
                data: [performanceData.producido, performanceData.vendido],
                backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(255, 99, 132, 0.5)'],
                borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Producido vs Vendido (Semana Actual)',
                },
            },
        },
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initTables();
    loadCharts();
    // Variables generales
    const userId = localStorage.getItem('id_usuario'); // ID del usuario logueado
    const modals = {
        productionModal: document.getElementById('productionModal'),
        salesModal: document.getElementById('salesModal'),
        addUserModal: document.getElementById('addUserModal'),
        addProductModal: document.getElementById('addProductModal'),
        addRawMaterialModal: document.getElementById('addRawMaterialModal'),
        taskModal: document.getElementById('taskModal'),
    };

    // Funciones para mostrar y cerrar modales
    const showModal = (modal) => modal.style.display = 'flex';
    const closeModal = (modal) => modal.style.display = 'none';

    // Botones para abrir modales
    document.getElementById('addProductionButton').addEventListener('click', () => {
        loadProductsProduction();
        showModal(modals.productionModal);
    });
    document.getElementById('addSaleButton').addEventListener('click', () => {
        loadAvailableProducts(); // Cargar productos disponibles para ventas
        showModal(modals.salesModal);
    });
    document.getElementById('addUserButtonAdmin').addEventListener('click', () => showModal(modals.addUserModal));
    document.getElementById('addProductButtonAdmin').addEventListener('click', () => showModal(modals.addProductModal));
    document.getElementById('addRawMaterialButtonAdmin').addEventListener('click', () => showModal(modals.addRawMaterialModal));
    document.getElementById('addTaskButtonAdmin').addEventListener('click', () => showModal(modals.taskModal));
    
    // Botones para cerrar modales
    Object.keys(modals).forEach(modalKey => {
        const closeButton = modals[modalKey].querySelector('.close') || modals[modalKey].querySelector('button[type="button"]');
        if (closeButton) closeButton.addEventListener('click', () => closeModal(modals[modalKey]));
    });

    // Inicio de sesión
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const contraseña = document.getElementById('contraseña').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, contraseña }),
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('id_usuario', result.usuario.id);
                console.log('Usuario al iniciar sesión:', result.usuario);

                document.getElementById('loginSection').style.display = 'none';
                if (result.usuario.rol === 'dueño') {
                    document.getElementById('ownerSection').style.display = 'block';
                    document.getElementById('welcomeOwnerMessage').textContent = `Bienvenido, ${result.usuario.nombre}`;
                    loadAdminData();
                } else {
                    document.getElementById('userSection').style.display = 'block';
                    document.getElementById('welcomeMessage').textContent = `Bienvenido, ${result.usuario.nombre}`;
                    loadUserData();
                }
            } else {
                alert(result.message || 'Error al iniciar sesión');
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
        }
    });

    // Función para cerrar sesión
    const logout = async () => {
    const id_usuario = localStorage.getItem('id_usuario');
    const egreso = new Date().toISOString();

    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario, egreso }),
        });

        if (!response.ok) {
            throw new Error('Error al cerrar sesión.');
        }

        alert('Sesión cerrada exitosamente.');
        localStorage.removeItem('id_usuario'); // Limpiar datos del usuario
        window.location.reload(); // Recargar la página
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Ocurrió un error al cerrar sesión. Intente nuevamente.');
    }
    };

// Vincular la función al botón de cerrar sesión
document.getElementById('logoutButton').addEventListener('click', logout);
document.getElementById('logoutButtonAdmin').addEventListener('click', logout);

// Función genérica para manejar la eliminación de elementos
const deleteItem = async (url, id, tableId) => {
    if (!id) {
        console.error('ID inválido para eliminar.');
        return;
    }
    if (confirm('¿Estás seguro de eliminar este elemento?')) {
        try {
            const response = await fetch(`${url}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar el elemento.');

            alert('Elemento eliminado correctamente.');

            // Eliminar la fila correspondiente del DOM
            const row = document.querySelector(`${tableId} .delete-button[data-id="${id}"]`)?.closest('tr');
            if (row) row.remove();
        } catch (error) {
            console.error('Error al eliminar el elemento:', error);
        }
    }
};

// Configuración de eventos con delegación
const setupDeleteButtons = () => {
    // Delegar eventos en la tabla de materia prima
    document.querySelector('#adminRawMaterialTable').addEventListener('click', (e) => {
        const button = e.target.closest('.delete-button');
        if (button) {
            const id = button.dataset.id;
            deleteItem('/api/materia-prima', id, '#adminRawMaterialTable');
        }
    });

    // Delegar eventos en la tabla de productos
    document.querySelector('#adminProductsTable').addEventListener('click', (e) => {
        const button = e.target.closest('.delete-button');
        if (button) {
            const id = button.dataset.id;
            deleteItem('/api/productos', id, '#adminProductsTable');
        }
    });

    // Delegar eventos en la tabla de empleados
    document.querySelector('#adminEmployeesTable').addEventListener('click', (e) => {
        const button = e.target.closest('.delete-button');
        if (button) {
            const id = button.dataset.id;
            deleteItem('/api/empleados', id, '#adminEmployeesTable');
        } else {
            console.error('ID inválido para el botón seleccionado.');
        }
    });
};

//funcion para completar y eliminar una tarea
const taskForm = document.getElementById('taskForm');

// Manejar la creación de tareas
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre_tarea = document.getElementById('taskName').value;
    const id_usuario = document.getElementById('taskUser').value;
    const dia_creada = document.getElementById('taskDate').value;
    const observaciones = document.getElementById('taskNotes').value;

    try {
        const response = await fetch('/api/tareas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_tarea, id_usuario, dia_creada, observaciones }),
        });

        if (!response.ok) {
            throw new Error('Error al crear la tarea.');
        }

        alert('Tarea creada con éxito.');
        document.getElementById('taskModal').style.display = 'none';
        taskForm.reset();
        loadAssignedTasks(localStorage.getItem('id_usuario')); // Recargar tareas
    } catch (error) {
        console.error('Error al crear tarea:', error);
        alert('Ocurrió un error al crear la tarea. Intente nuevamente.');
    }
});

// Cargar opciones de usuarios para asignar tareas
const loadUsersForTasks = async () => {
    try {
        const response = await fetch('/api/admin/empleados');
        const users = await response.json();

        const taskUserSelect = document.getElementById('taskUser');
        taskUserSelect.innerHTML = '<option disabled selected>Seleccione un usuario</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.nombre;
            taskUserSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar usuarios para tareas:', error);
    }
};

// Llamar a la función cuando se abra el modal
document.getElementById('addTaskButtonAdmin').addEventListener('click', () => {
    loadUsersForTasks();
    document.getElementById('taskModal').style.display = 'flex';
});

// Cerrar el modal de creación de tareas
document.getElementById('closeTaskModal').addEventListener('click', () => {
    document.getElementById('taskModal').style.display = 'none';
});

        const completeTask = async (taskId) => {
            try {
                const response = await fetch(`/api/tareas/${taskId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Error al marcar la tarea como completada.');
                }

                alert('Tarea completada con éxito.');
                loadAssignedTasks(localStorage.getItem('id_usuario')); // Recargar las tareas
            } catch (error) {
                console.error('Error al completar la tarea:', error);
                alert('Ocurrió un error al completar la tarea. Intente nuevamente.');
            }
        };

    const loadAssignedTasks = async (id) => {
        try {
            const response = await fetch(`/api/tareas?id_usuario=${id}`);
            if (!response.ok) {
            throw new Error(`Error al cargar tareas: ${response.statusText}`);
        }
            const tasks = await response.json();
            const taskTableBody = document.getElementById('taskTableBody');
            taskTableBody.innerHTML = tasks.map(task => `
                <tr>
                    <td>
                    <input type="checkbox" class="complete-task" data-task-id="${task.id}" />
                    </td>
                    <td>${task.nombre_tarea}</td>
                    <td>${task.usuario}</td>
                    <td>${task.observaciones}</td>
                    <td>${task.dia_creada}</td>
                </tr>
            `).join('');
             // Agregar eventos a los cuadros de check
        document.querySelectorAll('.complete-task').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const taskId = e.target.dataset.taskId;
                if (e.target.checked) {
                    await completeTask(taskId); // Marcar como completa y eliminar
                }
            });
        });
        } catch (error) {
            console.error('Error al cargar tareas:', error);
        }
    };

    const loadProductionData = async () => {
        try {
            const response = await fetch(`/api/produccion?id_usuario=${userId}`);
            const productions = await response.json();
            const productionTable = document.getElementById('productionTable').querySelector('tbody');
            productionTable.innerHTML = productions.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.sector}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.cantidad}</td>
                    <td>${row.unidad}</td>
                    <td>${row.usuario}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar producción:', error);
        }
    };

    const addProduction = async () => {
        const sector = document.getElementById('sector').value;
        const nombreProducto = document.getElementById('nombreProducto').value;
        const cantidad = document.getElementById('cantidad').value;
        const unidad = document.getElementById('unidad').value;
        const userId = localStorage.getItem('id_usuario'); 

        if (!userId) {
            alert('Usuario no autenticado. Por favor, inicie sesión nuevamente.');
            return;
        }
        try {
            const response = await fetch('/api/produccion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: localStorage.getItem('id_usuario'),
                    producto: nombreProducto,
                    sector,
                    cantidad,
                    unidad,
                }),
            });

            if (!response.ok) {
                throw new Error('Error al agregar producción.');
            }

            alert('Producción añadida correctamente.');
            closeModal(modals.productionModal);
            loadProductionData(); // Recargar tabla
        } catch (error) {
            console.error('Error al agregar producción:', error);
            alert('Ocurrió un error al agregar la producción.');
        }
    };

// Vincular la función al botón "Guardar" en el modal de producción
document.getElementById('saveProductionButton').addEventListener('click', addProduction);

    const loadSalesData = async () => {
        try {
            const response = await fetch(`/api/ventas?id_usuario=${userId}`);
            const sales = await response.json();
            const salesTable = document.getElementById('salesTable').querySelector('tbody');
            salesTable.innerHTML = sales.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.sector}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.precio}</td>
                    <td>${row.metodo_pago}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar ventas:', error);
        }
    };

    const loadSessionData = async () => {
        try {
             const userId = localStorage.getItem('id_usuario'); // Obtén el ID del usuario
        if (!userId) {
            console.error('Usuario no autenticado.');
            return;
        }
            const response = await fetch(`/api/sesiones?id_usuario=${userId}`);
            const sessions = await response.json();
            const sessionsTable = document.getElementById('sessionsTable').querySelector('tbody');
            sessionsTable.innerHTML = sessions.map(row => `
                <tr>
                    <td>${row.ingreso}</td>
                    <td>${row.egreso || 'Sesión activa'}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar sesiones:', error);
        }
    };

    // Cargar productos disponibles para ventas
    const loadAvailableProducts = async () => {
        try {
            const response = await fetch('/api/productos');
            const products = await response.json();

            // Filtrar solo productos con cantidad disponible > 0
            const availableProducts = products.filter(product => product.cantidad_disponible > 0);

            const productSelect = document.getElementById('nombreProductoVenta');
            const priceInput = document.getElementById('precioVenta');

            // Limpiar las opciones previas
        productSelect.innerHTML = '<option disabled selected>Seleccione un producto</option>';

             // Rellenar el <select> con productos disponibles
            availableProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.nombre} - ${product.cantidad_disponible} ${product.unidad}`;
                productSelect.appendChild(option);
            });

            // Actualizar el precio al seleccionar un producto
        productSelect.addEventListener('change', () => {
            const selectedProduct = availableProducts.find(p => p.id === parseInt(productSelect.value));
            priceInput.value = selectedProduct ? `$${selectedProduct.precio_venta.toFixed(2)}` : '';
        });
        } catch (error) {
            console.error('Error al cargar productos disponibles:', error);
        }
    };

    // Cargar productos disponibles para ventas
// Función para cargar productos en el dropdown del modal
async function loadProductsProduction() {
    try {
        // Llamada al backend para obtener todos los productos desde la base de datos
        const response = await fetch('/api/products'); // Asegúrate de que esta ruta esté configurada correctamente en tu backend
        if (!response.ok) {
            throw new Error('Error al cargar los productos desde la base de datos');
        }

        const products = await response.json();

        // Selecciona el elemento del dropdown del modal
        const productDropdown = document.getElementById('nombreProductoProduccion');

        // Limpia las opciones actuales
        productDropdown.innerHTML = '';

        // Itera sobre los productos obtenidos y crea las opciones del dropdown
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.nombre; // Ajusta "nombre" al nombre de tu columna en la base de datos
            option.textContent = product.nombre;
            productDropdown.appendChild(option);
        });

    } catch (error) {
        console.error('Error al cargar los productos en el modal:', error);
        alert('Hubo un error al cargar los productos. Inténtalo de nuevo.');
    }
}

    // Funciones para Admin
const loadAdminProductionData = async () => { 
        try {
            const response = await fetch('/api/admin/produccion');
            const productions = await response.json();
            const adminProductionTable = document.getElementById('adminProductionTable').querySelector('tbody');
            if (!Array.isArray(productions)) {
    throw new Error('Productions no es un array válido');
}
            adminProductionTable.innerHTML = productions.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.usuario}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.cantidad}</td>
                    <td>${row.unidad}</td>
                    <td>${row.sector}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar producción (admin):', error);
        }
};

    // Función para manejar el formulario de agregar producto
    const addProductForm = document.getElementById('addProductForm');
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener los datos del formulario
        const nombre = document.getElementById('nombreProductoNuevo').value;
        const sector = document.getElementById('sectorProducto').value;
        const cantidad_disponible = parseInt(document.getElementById('cantidad_disponibleProducto').value);
        const unidad = document.getElementById('unidadProducto').value;
        const precio_unitario = parseFloat(document.getElementById('precioUnitarioProducto').value);
        const precio_venta = parseFloat(document.getElementById('precioVentaProducto').value);

        if (!nombre || !sector || isNaN(cantidad_disponible) || !unidad || isNaN(precio_unitario) || isNaN(precio_venta)) {
            alert('Por favor, complete todos los campos correctamente.');
            return;
        }

        try {
            // Realizar solicitud POST al backend
            const response = await fetch('/api/admin/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    sector,
                    cantidad_disponible,
                    unidad,
                    precio_unitario,
                    precio_venta
                }),
            });

            if (!response.ok) {
                throw new Error('Error al agregar el producto.');
            }

            alert('Producto agregado exitosamente.');

            // Limpiar el formulario y cerrar el modal
            addProductForm.reset();
            closeModal(document.getElementById('addProductModal'));

            // Recargar los datos de la tabla de productos
            loadAdminProducts();
        } catch (error) {
            console.error('Error al agregar producto:', error);
            alert('Ocurrió un error al agregar el producto. Intente nuevamente.');
        }
    });

    const loadAdminProducts = async () => {
        try {
            const response = await fetch('/api/admin/productos');
            const products = await response.json();
            const adminProductsTable = document.getElementById('adminProductsTable').querySelector('tbody');
            adminProductsTable.innerHTML = products.map(row => `
                <tr data-id="${row.id}">
                    <td>${row.nombre}</td>
                    <td>${row.precio_unitario.toFixed(2)}</td>
                    <td>${row.precio_venta.toFixed(2)}</td>
                    <td>${row.cantidad_disponible}</td>
                    <td>${row.unidad}</td>
                    <td><button class="delete-button" data-id="${row.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                    <td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar productos (admin):', error);
        }
        setupDeleteButtons();
    };

    const loadAdminSalesData = async () => {
        try {
            const response = await fetch('/api/admin/ventas');
            const sales = await response.json();
            const adminSalesTable = document.getElementById('adminSalesTable').querySelector('tbody');
            adminSalesTable.innerHTML = sales.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.usuario}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.sector}</td>
                    <td>${row.precio}</td>
                    <td>${row.metodo_pago}</td>
                    <td>${row.cantidad}</td>
                    <td>${row.total}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar ventas (admin):', error);
        }
    };
    const loadAdminRawMaterialData = async () => {
        try {
            const response = await fetch('/api/admin/materia-prima');
            const rawMaterials = await response.json();
            const adminRawMaterialTable = document.getElementById('adminRawMaterialTable').querySelector('tbody');
            adminRawMaterialTable.innerHTML = rawMaterials.map(row => `
                <tr data-id="${row.id}">
                    <td>${row.nombre}</td>
                    <td>${row.cantidad}</td>
                    <td>${row.unidad}</td>
                    <td>${row.precio_compra}</td>
                    <td>${row.fecha_hora}</td>
                    <td>
                        <button class="delete-button" data-id="${row.id}">
                        <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar materia prima (admin):', error);
        }
        setupDeleteButtons();
    };
    const loadAdminUsersData = async () => {
         try {
            const response = await fetch('/api/admin/usuarios');
            const users = await response.json();
            const adminUsersTable = document.getElementById('adminUsersTable').querySelector('tbody');
            adminUsersTable.innerHTML = users.map(user => `
                <tr>
                    <td>${user.nombre}</td>
                    <td>${user.ultimo_ingreso}</td>
                    <td>${user.ultimo_egreso}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar usuarios (admin):', error);
        }
    };
    const loadAdminEmployeesData = async () => {
        try {
            const response = await fetch('/api/admin/empleados');
            const employees = await response.json();
            const adminEmployeesTable = document.getElementById('adminEmployeesTable').querySelector('tbody');
            adminEmployeesTable.innerHTML = employees.map(row => `
                <tr data-id="${row.id}">
                    <td>${row.nombre}</td>
                    <td>${row.sector}</td>
                    <td>
                        <button class="delete-button" id="${row.id}">
                        <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar empleados (admin):', error);
        }
        setupDeleteButtons();
    };
    const submitSalesForm = async (e) => {
        e.preventDefault();

        const productId = parseInt(document.getElementById('nombreProductoVenta').value);
        const quantityToSell = parseInt(document.getElementById('cantidadVenta').value);

        if (!productId || !quantityToSell || quantityToSell <= 0) {
            alert('Por favor, seleccione un producto y una cantidad válida.');
            return;
        }

        try {
            // Verificar si el stock es suficiente antes de realizar la venta
            const productResponse = await fetch(`/api/productos/${productId}`);
            const product = await productResponse.json();

            if (product.cantidad_disponible < quantityToSell) {
                alert(`No hay suficiente stock para realizar la venta. Disponible: ${product.cantidad_disponible}`);
                return;
            }

            // Realizar la venta
            const ventaResponse = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_producto: productId,
                    cantidad: quantityToSell,
                    precio: product.precio_venta,
                    metodo_pago: document.getElementById('metodoPago').value,
                    sector: document.getElementById('sectorVenta').value,
                    id_usuario: localStorage.getItem('id_usuario'),
                    fecha_hora: new Date().toISOString(),
                }),
            });

            if (!ventaResponse.ok) {
                throw new Error('Error al registrar la venta');
            }

            // Actualizar el stock en la base de datos
            const nuevoStock = product.cantidad_disponible - quantityToSell;
            await fetch(`/api/productos/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cantidad_disponible: nuevoStock }),
            });

            alert('Venta realizada con éxito. El stock ha sido actualizado.');

            // Limpiar formulario y recargar datos
            document.getElementById('salesForm').reset();
            closeModal(modals.salesModal);
            loadAvailableProducts(); // Actualizar productos disponibles
            loadAdminProducts(); // Actualizar tabla de productos en el panel admin
        } catch (error) {
            console.error('Error al procesar la venta:', error);
            alert('Ocurrió un error al realizar la venta. Intente nuevamente.');
        }
    };

    //conectar al formulario las ventas y productos con stock
    document.getElementById('salesForm').addEventListener('submit', submitSalesForm);

    const submitAddUserForm = async (e) => {
    e.preventDefault(); // Evitar recargar la página

    // Obtener los valores del formulario
    const nombre = document.getElementById('nombreUsuario').value;
    const rol = document.getElementById('rolUsuario').value;
    const sector = document.getElementById('sectorUsuario').value;
    const contraseña = document.getElementById('contraseñaUsuario').value;

    if (!nombre || !rol || !sector || !contraseña) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

     // Validar longitud de la contraseña
     if (contraseña.length < 3) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    const rolesPermitidos = ['Empleado', 'Administrador'];
    if (!rolesPermitidos.includes(rol)) {
        alert('Rol inválido. Por favor, seleccione un rol válido.');
        return;
    }

    try {
        // Enviar los datos al backend
        const response = await fetch('/api/admin/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, rol, sector, contraseña }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al agregar usuario.');
        }

        alert('Usuario agregado correctamente.');

        // Limpiar formulario y cerrar el modal
        document.getElementById('addUserForm').reset();
        closeModal(modals.addUserModal);

        // Recargar la lista de usuarios en el panel admin
        loadAdminUsersData();
    } catch (error) {
        console.error('Error al agregar usuario:', error);
        alert('Ocurrió un error al agregar el usuario. Intente nuevamente.');
    }
};

// Función para manejar el formulario de agregar materia prima
const addRawMaterialForm = document.getElementById('addRawMaterialForm');

addRawMaterialForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener los datos del formulario
    const nombre = document.getElementById('nombreMateriaPrima').value;
    const cantidad = parseFloat(document.getElementById('cantidadMateriaPrima').value);
    const unidad = document.getElementById('unidadMateriaPrima').value;
    const precio_compra = parseFloat(document.getElementById('precioCompraMateriaPrima').value);
    const fecha_hora = new Date().toISOString(); // Usar la fecha actual

    if (!nombre || isNaN(cantidad) || !unidad || isNaN(precio_compra)) {
        alert('Por favor, complete todos los campos correctamente.');
        return;
    }

    try {
        // Realizar solicitud POST al backend
        const response = await fetch('/api/admin/materia-prima', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre,
                cantidad,
                unidad,
                precio_compra,
                fecha_hora,
            }),
        });

        if (!response.ok) {
            throw new Error('Error al agregar la materia prima.');
        }

        alert('Materia prima agregada exitosamente.');

        // Limpiar el formulario y cerrar el modal
        addRawMaterialForm.reset();
        closeModal(document.getElementById('addRawMaterialModal'));

        // Recargar los datos de la tabla de materia prima
        loadAdminRawMaterialData();
    } catch (error) {
        console.error('Error al agregar materia prima:', error);
        alert('Ocurrió un error al agregar la materia prima. Intente nuevamente.');
    }
});

// Cerrar modal de agregar materia prima al presionar el botón de cancelar
document.getElementById('cancelAddRawMaterialForm').addEventListener('click', () => {
    addRawMaterialForm.reset();
    closeModal(document.getElementById('addRawMaterialModal'));
});

// Asociar la función al evento submit del formulario
document.getElementById('addUserForm').addEventListener('submit', submitAddUserForm);

// Opción para cancelar el formulario
document.getElementById('cancelAddUserForm').addEventListener('click', () => {
    document.getElementById('addUserForm').reset();
    closeModal(modals.addUserModal);
});

// Cerrar modal de agregar producto al presionar el botón de cancelar
document.getElementById('cancelAddProductForm').addEventListener('click', () => {
    addProductForm.reset();
    closeModal(document.getElementById('addProductModal'));
});

    // Funciones para cargar datos
    const loadUserData = async () => {
        await loadAssignedTasks(userId);
        await loadProductionData();
        await loadSalesData();
        await loadSessionData();
    };

    const loadAdminData = async () => {
        await loadAdminProductionData();
        await loadAdminProducts();
        await loadAdminSalesData();
        await loadAdminRawMaterialData();
        await loadAdminUsersData();
        await loadAdminEmployeesData();
        setupDeleteButtons();
    };

     loadAdminData(); // Inicializa la carga de datos para el admin
});