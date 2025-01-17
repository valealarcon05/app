document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('id_usuario'); // Obtener el ID del usuario desde el localStorage
    if (userId) {
        loadAssignedTasks(userId);
    } else {
        console.error('Error: No se encontró id_usuario en el localStorage');
    }
//INICIO SESION
    //Declarac Inicio sesion
    const loginSection = document.getElementById('loginSection');
    const loginForm = document.getElementById('loginForm');

        // Mostrar la sección de inicio de sesión al cargar
        loginSection.style.display = 'block';

        // Manejar el inicio de sesión usuario y dueño
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

                if (response.status === 200) {
                    alert(result.message);
                    localStorage.setItem('id_usuario', result.usuario.id); // Guardar ID en localStorage
                    
                    loginSection.style.display = 'none';

                    if (result.usuario.rol === 'dueño') {
                        // Mostrar el panel de dueño
                    document.getElementById('ownerSection').style.display = 'block';
                    document.getElementById('welcomeOwnerMessage').textContent = `Bienvenido, ${result.usuario.nombre}`;
                    loadAdminData(); // Cargar datos del panel de administrador
                
                    } else { //Mostrar panel usuario
                    userSection.style.display = 'block';
                    welcomeMessage.textContent = `Bienvenido, ${result.usuario.nombre}`;
                    loadProductionData();
                    loadSalesData();
                    loadSessionData();
                }

                    // Cargar datos específicos del usuario
                if (result.usuario.rol !== 'empleado') {
                    loadProductionData();
                    loadSalesData();
                    loadSessionData();
                    }
                } else {
                    alert(result.message);
                }
            }
            catch (error) {
                console.error('Error:', error);
            }
        });

    //Declarac Cerrar sesion usuario
    const logoutButton = document.getElementById('logoutButton');

    // Manejar el cierre de sesión usuario
    logoutButton.addEventListener('click', async () => {
        const idUsuario = localStorage.getItem('id_usuario');
        const now = new Date().toISOString();
    
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario: idUsuario, egreso: now }),
            });

             // Reiniciar la vista
        document.getElementById('ownerSection').style.display = 'none';
    
            // Cambiar la vista al formulario de inicio de sesión
            userSection.style.display = 'none';
            loginSection.style.display = 'block';
            document.getElementById('nombre').value = '';
            document.getElementById('contraseña').value = '';
            localStorage.removeItem('id_usuario');

        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    });
    
    //Declarac Cerrar sesion admin
    const logoutButtonAdmin = document.getElementById('logoutButtonAdmin');

    //Funcion logout cerrar sesión Admin (no funciona)
    logoutButtonAdmin.addEventListener('click', async () => {
        const idUsuario = localStorage.getItem('id_usuario');
        const now = new Date().toISOString();
    
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario: idUsuario, egreso: now }),
            });

             // Reiniciar la vista
        document.getElementById('ownerSection').style.display = 'none';
    
            // Cambiar la vista al formulario de inicio de sesión
            userSection.style.display = 'none';
            loginSection.style.display = 'block';
            document.getElementById('nombre').value = '';
            document.getElementById('contraseña').value = '';
            localStorage.removeItem('id_usuario');

        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    });
//PANEL USUARIO
        //Declarac Panel de Usuario
        const userSection = document.getElementById('userSection');
        const welcomeMessage = document.getElementById('welcomeMessage');

        //Declarac Botones usuario
        const addProductionButton = document.getElementById('addProductionButton');
        const addSaleButton = document.getElementById('addSaleButton');

        //Declarac Tablas usuario
        const productionTable = document.getElementById('productionTable').querySelector('tbody');
        const salesTable = document.getElementById('salesTable').querySelector('tbody');
        const sessionsTable = document.getElementById('sessionsTable').querySelector('tbody');
        const taskTableBody = document.getElementById('taskTableBody');

        // Mostrar modal de producción
        addProductionButton.addEventListener('click', () => {
            document.getElementById('productionModal').style.display = 'flex';
        });

        // Cerrar modal de producción
        document.getElementById('closeProductionModal').addEventListener('click', () => {
            document.getElementById('productionModal').style.display = 'none';
        });

        // Mostrar modal de ventas
        addSaleButton.addEventListener('click', () => {
            document.getElementById('salesModal').style.display = 'flex';
        });

        // Cerrar modal de ventas
        document.getElementById('closeSalesModal').addEventListener('click', () => {
            document.getElementById('salesModal').style.display = 'none';
        });

        document.getElementById('addSaleButton').addEventListener('click', () => {
            loadAvailableProducts(); // Cargar los productos
            document.getElementById('salesModal').style.display = 'flex';
        });
        
    // Funciones para cargar datos
    // Función para cargar tareas en la tabla
    const loadTasks = async () => {
        const userId = JSON.parse(localStorage.getItem('userId'));
        console.log('Cargando tareas para userId:', userId);

        try{
        const response = await fetch(`/api/admin/tareas?id_usuario=${userId}`);
        if (!response.ok) throw new Error('Error al obtener tareas');
        const tasks = await response.json();
        console.log('Tareas obtenidas:', tasks);

        taskTableBody.innerHTML = '';
        tasks.forEach(task => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.nombre_tarea}</td>
                <td>${task.usuario}</td>
                <td>${task.dia_creada}</td>
                <td>${task.observaciones}</td>
            `;
            taskTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar tareas:', error);
    }
    };

    async function loadProductionData() {
        try {
            const idUsuario = localStorage.getItem('id_usuario'); 
            const response = await fetch(`/api/produccion?id_usuario=${idUsuario}`);
            const data = await response.json();
            productionTable.innerHTML = data.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.sector}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.usuario}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar producción:', error);
        }
    }

    async function loadSalesData() {
        try {
            const response = await fetch('/api/ventas');
            const data = await response.json();
            salesTable.innerHTML = data.map(row => `
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
    }

    async function loadSessionData() {
        const idUsuario = localStorage.getItem('id_usuario');

        try {
            const response = await fetch(`/api/sesiones?id_usuario=${idUsuario}`);
            const data = await response.json();

            if (data && Array.isArray(data)) {
                sessionsTable.innerHTML = data.map(row => `
                <tr>
                    <td>${row.ingreso}</td>
                    <td>${row.egreso ? row.egreso: 'Sesión activa'}</td>
                </tr>
            `).join('');
                } else {
                    console.error('La respuesta de /api/sesiones no contiene datos válidos:', data);
                }
        } catch (error) {
            console.error('Error al cargar sesiones:', error);
        }
    }

    async function loadProductionData() {
        try {
            const idUsuario = localStorage.getItem('id_usuario');
            const response = await fetch(`/api/produccion?id_usuario=${idUsuario}`);
            const data = await response.json();
            if (Array.isArray(data)){
            productionTable.innerHTML = data.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.sector}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.cantidad}</td>
                    <td>${row.unidad}</td>
                    <td>${row.usuario}</td>
                </tr>
            `).join('');
            } else {
                console.error('La respuesta de /api/produccion no contiene un array:', data);
            }
        } catch (error) {
            console.error('Error al cargar producción:', error);
        }
    }

    async function loadSalesData() {
        try {
            const idUsuario = localStorage.getItem('id_usuario');
            const response = await fetch(`/api/ventas?id_usuario=${idUsuario}`);
            const data = await response.json();

            if(Array.isArray(data)){
                salesTable.innerHTML = data.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.sector}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.precio}</td>
                    <td>${row.metodo_pago}</td>
                </tr>
            `).join('');
                } else {
                    console.error('La respuesta de /api/ventas no contiene un array:', data);
                }
        } catch (error) {
            console.error('Error al cargar ventas:', error);
        }
    }

    // Cargar productos disponibles en el select de agregar venta
    async function loadAvailableProducts() {
        try {
            // Realizar la solicitud para obtener los productos
            const response = await fetch('/api/productos');
            
            if (!response.ok) {
                throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
            }

            const productos = await response.json();
            const nombreProductoVenta = document.getElementById('nombreProductoVenta');
            const precioVenta = document.getElementById('precioVenta');
            // Verifica si la respuesta contiene un array de productos
            if (Array.isArray(productos)) {
                
                // Limpia las opciones existentes
                nombreProductoVenta.innerHTML = '<option value="" disabled selected>Seleccione un producto</option>';

                const preciosProductos = {};

                // Agrega las opciones dinámicamente
                productos.forEach(producto => {
                    const option = document.createElement('option');
                    option.value = producto.id; // Es mejor usar el ID del producto para identificarlo
                    option.textContent = `${producto.nombre} - ${producto.cantidad_disponible} ${producto.unidad} (${producto.sector})`;
                    nombreProductoVenta.appendChild(option);

                    // Almacena el precio del producto
                    preciosProductos[producto.id] = producto.precio_venta;
                });
                    // Actualizar el precio al seleccionar un producto
                nombreProductoVenta.addEventListener('change', () => {
                    const selectedProductId = nombreProductoVenta.value;
                    if (selectedProductId) {
                        precioVenta.value = `$${preciosProductos[selectedProductId]}`;
                    } else {
                        precioVenta.value = ''; 
                    }
                });
            } else {
                console.error('Respuesta inesperada al obtener productos:', productos);
            }
        } catch (error) {
            console.error('Error al cargar productos disponibles:', error.message);
        }
    }

    const submitSalesForm = async () => {
        const userId = JSON.parse(localStorage.getItem('userId'));
        const productId = document.getElementById('productSelect').value;
        const quantity = document.getElementById('quantityInput').value;
        const price = document.getElementById('priceInput').value;
    
        if (!userId) {
            alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            window.location.href = '/login';
            return;
        }
    
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, productId, quantity, price }),
        });
    
        if (!response.ok) {
            console.error('Error al registrar la venta');
            return;
        }
    
        alert('Venta registrada con éxito');
    };
        
//PANEL ADMIN
    //Declarac botones admin 
    const addUserButtonAdmin = document.getElementById('addUserButtonAdmin');
    const addProductButtonAdmin = document.getElementById('addProductButtonAdmin');
    const addRawMaterialButtonAdmin = document.getElementById('addRawMaterialButtonAdmin');
    
        //Declarac Formulario crear usuario Admin
        const addUserFormSection = document.getElementById('addUserFormSection');
        const addUserForm = document.getElementById('addUserForm');
        const cancelAddUserForm = document.getElementById('cancelAddUserForm');

        //Declarac Formulario crear producto Admin
        const addProductFormSection = document.getElementById('addProductFormSection');
        const addProductForm = document.getElementById('addProductForm');
        const cancelAddProductForm = document.getElementById('cancelAddProductForm');

        //Declarac Formulario crear materia prima Admin
        const addRawMaterialFormSection = document.getElementById('addRawMaterialFormSection');
        const addRawMaterialForm = document.getElementById('addRawMaterialForm');

        //Declarac Formulario crear tarea Admin
        const taskFormSection = document.getElementById('taskFormSection');
        const taskForm = document.getElementById('taskForm'); 

        //Funciones Botones Admin
        addUserButtonAdmin.addEventListener('click', () => addUserFormSection.style.display = 'block');
        addProductButtonAdmin.addEventListener('click', () => addProductFormSection.style.display = 'block');
        addRawMaterialButtonAdmin.addEventListener('click', () => addRawMaterialFormSection.style.display = 'block');

        // Ocultar formularios
        const hideForm = (formSection) => formSection.style.display = 'none';
        document.getElementById('cancelAddUserForm').addEventListener('click', () => hideForm(addUserFormSection));
        document.getElementById('cancelAddProductForm').addEventListener('click', () => hideForm(addProductFormSection));
        document.getElementById('cancelAddRawMaterialForm').addEventListener('click', () => hideForm(addRawMaterialFormSection));

            // Manejar el envío de formularios Admin
            addUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nombre = document.getElementById('nombreUsuario').value;
                const rol = document.getElementById('rolUsuario').value;
                const contraseña = document.getElementById('contraseñaUsuario').value;
                try {
                    const response = await fetch('/api/usuarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, rol, contraseña }),
                    });
            
                    if (response.ok) {
                        alert('Usuario agregado exitosamente');
                        addUserForm.reset();
                        addUserFormSection.style.display = 'none';
                        // Recargar tabla de usuarios
                        loadAdminUsersData();
                    } else {
                        const errorResponse = await response.json();
                        console.error('Error al agregar usuario:', errorResponse);
                        alert(errorResponse.error || 'Error al agregar usuario.');
                    }
                } catch (error) {
                    console.error('Error al enviar la solicitud de usuario:', error);
                }
            });

            addProductForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nombreProducto = document.getElementById('nombreProducto').value.trim();
                const cantidad_disponible = document.getElementById('cantidad_disponibleProducto').value.trim();
                const unidad = document.getElementById('unidadProducto').value.trim();
                const precioUnitario = document.getElementById('precioUnitarioProducto').value.trim(); // Nuevo campo
                const sector = document.getElementById('sectorProducto').value.trim();
                const fecha_Hora = new Date().toISOString();
            try{
                    const response = await fetch('/api/admin/productos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            nombre: nombreProducto,
                            cantidad_disponible,
                            unidad,
                            precio_unitario: precioUnitario,
                            precio_venta: precioVenta, // Asegúrate de incluir este campo
                            sector,
                            fecha_hora: fecha_Hora,    
                        }),
                    });
            
                    if (response.ok) {
                        alert('Producto agregado exitosamente');
                        addProductForm.reset();
                        addProductFormSection.style.display = 'none';
                        // Recargar tabla de productos
                        loadAdminProducts();
                    } else {
                        const errorResponse = await response.json();
                        console.error('Error al agregar producto:', errorResponse);
                        alert(errorResponse.error || 'Error al agregar producto.');
                    }
                } catch (error) {
                    console.error('Error al enviar la solicitud de producto:', error);
                }
            });

            addRawMaterialForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nombreMateriaPrima = document.getElementById('nombreMateriaPrima').value;
                const cantidad = document.getElementById('cantidadMateriaPrima').value;
                const unidad = document.getElementById('unidadMateriaPrima').value;
                const precioCompra = document.getElementById('precioCompraMateriaPrima').value;
                const fecha_hora = new Date().toISOString(); 
                try {
                    const response = await fetch('/api/materia-prima', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombreMateriaPrima, cantidad, unidad, precioCompra, fecha_hora }),
                    });
            
                    if (response.ok) {
                        alert('Materia Prima agregada exitosamente');
                        addRawMaterialForm.reset();
                        addRawMaterialFormSection.style.display = 'none';
                        // Recargar tabla de materia prima
                        loadAdminRawMaterialData();
                    } else {
                        const errorResponse = await response.json();
                        console.error('Error al agregar materia prima:', errorResponse);
                        alert(errorResponse.error || 'Error al agregar materia prima.');
                    }
                } catch (error) {
                    console.error('Error al enviar la solicitud de materia prima:', error);
                }
            });

            // Mostrar formulario de crear tarea ADMIN
            document.getElementById('addTaskButtonAdmin').addEventListener('click', () => {
                taskFormSection.style.display = 'block';
            });

            document.getElementById('addSaleButton').addEventListener('click', async () => {
                await loadAvailableProducts();
            });






//Carga datos panel admin
async function loadAdminData() {
    await loadAdminProductionData();
    await loadAdminProducts();
    await loadAdminSalesData();
    await loadAdminRawMaterialData();
    await loadAdminUsersData();
    await loadAdminEmployeesData();
}
// Boton abrir formulario de agregar usuario
addUserButtonAdmin.addEventListener('click', () => {
    addUserFormSection.style.display = 'block';
});

// Ocultar formulario de agregar usuario
cancelAddUserForm.addEventListener('click', () => {
    addUserFormSection.style.display = 'none';
});

// Manejar el envío del formulario de agregar usuario
addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombreUsuario').value;
    const rol = document.getElementById('rolUsuario').value;
    const contraseña = document.getElementById('contraseñaUsuario').value;

    try {
        const response = await fetch('/api/admin/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, rol, contraseña }),
        });

        if (response.status === 200) {
            alert('Usuario añadido con éxito');
            addUserForm.reset();
            addUserFormSection.style.display = 'none';
            loadAdminUsersData(); // Recargar tabla de usuarios
        } else {
            alert('Error al agregar usuario.');
        }
    } catch (error) {
        console.error('Error al agregar usuario:', error);
    }
});

 // Mostrar formulario de agregar producto
 addProductButtonAdmin.addEventListener('click', () => {
    addProductFormSection.style.display = 'block';
});

// Ocultar formulario de agregar producto
cancelAddProductForm.addEventListener('click', () => {
    addProductFormSection.style.display = 'none';
});

// Manejar el envío del formulario de agregar producto
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombreProductoNuevo').value;
    const sector = document.getElementById('sectorProducto').value;
    const cantidad = document.getElementById('cantidadProducto').value;
    const unidad = document.getElementById('unidadProducto').value;
    const precio_venta = document.getElementById('precioVentaProducto').value;

    try {
        const response = await fetch('/api/admin/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, sector, cantidad, unidad, precio_venta }),
        });

        if (response.status === 200) {
            alert('Producto añadido con éxito');
            addProductForm.reset();
            addProductFormSection.style.display = 'none';
            loadAdminProducts(); // Recargar tabla de productos
        } else {
            alert('Error al agregar producto.');
        }
    } catch (error) {
        console.error('Error al agregar producto:', error);
    }
});

async function loadAdminProductionData() {
    try {
        const response = await fetch('/api/admin/produccion');
        const data = await response.json();

        const adminProductionTable = document.getElementById('adminProductionTable').querySelector('tbody');
        adminProductionTable.innerHTML = data.map(row => `
            <tr>
                <td>${row.producto}</td>
                <td>${row.usuario}</td>
                <td>${row.fecha_hora}</td>
                <td>${row.cantidad}</td>
                <td>${row.unidad}</td>
                <td>${row.sector}</td>
                <td>
                    <button class="edit-btn">Editar</button>
                    <button class="delete-btn">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar producción (admin):', error);
    }
}

async function loadAdminProducts() {
    try {
        const response = await fetch('/api/admin/productos');
        const data = await response.json();

        if (Array.isArray(data)) {
            const adminProductsTable = document.getElementById('adminProductsTable').querySelector('tbody');
            adminProductsTable.innerHTML = data.map(row => `
                <tr>
                    <td>${row.nombre}</td>
                    <td>${row.precio_unitario.toFixed(2)}</td>
                    <td>${row.precio_venta.toFixed(2)}</td>
                    <td>${row.cantidad_disponible}</td>
                    <td>${row.unidad}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

async function loadAdminSalesData() {
    try {
        const response = await fetch('/api/admin/ventas');
        const data = await response.json();

        if (Array.isArray(data)) {
            const adminSalesTable = document.getElementById('adminSalesTable').querySelector('tbody');
            adminSalesTable.innerHTML = data.map(row => `
                <tr>
                    <td>${row.producto}</td>
                    <td>${row.usuario}</td>
                    <td>${row.fecha_hora}</td>
                    <td>${row.sector}</td>
                    <td>${row.precio_venta.toFixed(2)}</td>
                    <td>${row.metodo_pago}</td>
                    <td>${row.cantidad}</td>
                    <td>${row.total.toFixed(2)}</td>
                    <td>
                        <button class="edit-btn">Editar</button>
                        <button class="delete-btn">Eliminar</button>
                    </td>
                </tr>
            `).join('');
        } else {
            console.error('Respuesta inesperada de la API:', data);
        }
    } catch (error) {
        console.error('Error al cargar ventas (admin):', error);
    }
}

async function loadAdminRawMaterialData() {
    try {
        const response = await fetch('/api/admin/materia-prima');
        const data = await response.json();

        const adminRawMaterialTable = document.getElementById('adminRawMaterialTable').querySelector('tbody');
        adminRawMaterialTable.innerHTML = data.map(row => `
            <tr>
                <td>${row.nombre}</td>
                <td>${row.cantidad}</td>
                <td>${row.unidad}</td>
                <td>${row.precio_compra}
                <td>${row.fecha_hora}</td>
                <td>
                    <button class="edit-btn">Editar</button>
                    <button class="delete-btn">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar materia prima (admin):', error);
    }
}

async function loadAssignedTasks(userId) {
    try {
        const response = await fetch(`/api/admin/tareas?id_usuario=${userId}`);
        if (!response.ok) throw new Error('Error al cargar tareas');

        const tasks = await response.json(); // Obtén las tareas en formato JSON
        const taskTableBody = document.getElementById('taskTableBody');

        // Actualiza la tabla con las tareas
        taskTableBody.innerHTML = tasks.map(task => `
            <tr>
                <td>${task.nombre_tarea}</td>
                <td>${task.usuario}</td>
                <td>${task.dia_creada}</td>
                <td>${task.observaciones}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar tareas:', error.message);
    }
}

async function loadAdminUsersData() {
    const taskUserSelect = document.getElementById('taskUser');
    const adminUsersTable = document.getElementById('adminUsersTable').querySelector('tbody');

    try {
        const response = await fetch('/api/admin/usuarios');
        if (!response.ok) throw new Error('Error al cargar usuarios');

        const users = await response.json(); // Obtén los datos en formato JSON

        // Actualizar las opciones del select
        taskUserSelect.innerHTML = ''; // Limpia las opciones anteriores
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id; // Usa el ID como valor
            option.textContent = user.nombre; // Muestra el nombre en el select
            taskUserSelect.appendChild(option);
        });

        // Actualizar la tabla de usuarios
        adminUsersTable.innerHTML = users.map(user => `
            <tr>
                <td>${user.nombre}</td>
                <td>${user.ultimo_ingreso}</td>
                <td>${user.ultimo_egreso}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar usuarios (admin):', error.message);
    }
}

    //Carga datos empleados
    async function loadAdminEmployeesData() {
        try {
            const response = await fetch('/api/admin/empleados');
            const data = await response.json();

            const adminEmployeesTable = document.getElementById('adminEmployeesTable').querySelector('tbody');
            adminEmployeesTable.innerHTML = data.map(row => `
                <tr>
                    <td>${row.nombre}</td>
                    <td>
                        <button class="edit-btn">Editar</button>
                        <button class="delete-btn">Eliminar</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar empleados (admin):', error);
        }
    }

       
        // Crear una nueva tarea
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskName = document.getElementById('taskName').value;
            const taskUser = document.getElementById('taskUser').value;
            const taskDate = document.getElementById('taskDate').value;
            const taskNotes = document.getElementById('taskNotes').value;

            await fetch('/api/admin/tareas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre_tarea: taskName,
                    id_usuario: taskUser,
                    dia_creada: taskDate,
                    observaciones: taskNotes
                })
            });

            taskFormSection.style.display = 'none';
            taskForm.reset();
            loadTasks();
        });

        // Cancelar formulario de tarea
        document.getElementById('cancelTaskForm').addEventListener('click', () => {
            taskFormSection.style.display = 'none';
            taskForm.reset();
        });

});