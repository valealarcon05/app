import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import Joi from 'joi';

const app = express();
const PORT =process.env.PORT || 4000;

// Base de datos SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('Conexión exitosa a la base de datos SQLite.');
    }
});

// Crear tabla si no existe
db.serialize (() => {
db.run(`
    CREATE TABLE IF NOT EXISTS Usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        rol TEXT,
        contraseña TEXT
    )
`);
db.run(`
    CREATE TABLE IF NOT EXISTS Produccion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto TEXT,
            sector TEXT,
            fecha_hora TEXT,
            cantidad INTEGER,
            unidad TEXT,
            usuario TEXT,
            id_usuario INTEGER,
            FOREIGN KEY(id_usuario) REFERENCES Usuarios(id)
        )
`);
db.run(`
    CREATE TABLE IF NOT EXISTS Ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto TEXT,
        sector TEXT,
        fecha_hora TEXT,
        precio REAL,
        metodo_pago TEXT,
        id_usuario INTEGER,
        FOREIGN KEY(id_usuario) REFERENCES Usuarios(id)
    )
`);
db.run(`
    CREATE TABLE IF NOT EXISTS Sesiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ingreso TEXT,
        egreso TEXT,
        id_usuario INTEGER,
        FOREIGN KEY(id_usuario) REFERENCES Usuarios(id)
    )
`);
db.run(`
    CREATE TABLE IF NOT EXISTS MateriaPrima (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        cantidad REAL,
        unidad TEXT,
        fecha_hora TEXT
    )
`);
db.run(`
    CREATE TABLE IF NOT EXISTS Tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_tarea TEXT NOT NULL,
        id_usuario INTEGER NOT NULL,
        observaciones TEXT,
        dia_creada TEXT NOT NULL,
        FOREIGN KEY (id_usuario) REFERENCES Usuarios(id)
    )
`);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(path.resolve(), 'public')));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Sirve el archivo HTML principal
});


app.use((req, res, next) => {
    console.log(`Solicitud recibida: ${req.method} ${req.url}`);
    next();
});

// Database connection
const dbPromise = open({
    filename: './database.db',
    driver: sqlite3.Database
});

// Validation schemas
const productionSchema = Joi.object({
    id_usuario: Joi.number().integer().required(),
    producto: Joi.string().min(1).required(),
    sector: Joi.string().valid('congelados', 'kiosko', 'parrilla', 'cantina').required(),
    cantidad: Joi.number().positive().required(),
    unidad: Joi.string().valid('kg', 'g', 'litro', 'ml', 'unidad', 'otro').required()
});

const saleSchema = Joi.object({
    id_producto: Joi.number().integer().required(),
    cantidad: Joi.number().positive().required(),
    precio: Joi.number().positive().required(),
    metodo_pago: Joi.string().valid('efectivo', 'tarjeta', 'billetera_virtual').required(),
    sector: Joi.string().valid('congelados', 'kiosko', 'parrilla', 'cantina').required(),
    id_usuario: Joi.number().integer().required(),
    fecha_hora: Joi.date().iso().required()
});

const userSchema = Joi.object({
    nombre: Joi.string().min(1).required(),
    rol: Joi.string().valid('empleado', 'dueño').required(),
    contraseña: Joi.string().min(6).required()
});

// **API: Inicio de sesión**
app.post('/api/login', (req, res) => {
    const { nombre, contraseña } = req.body;

    const query = `SELECT * FROM Usuarios WHERE nombre = ? AND contraseña = ?`;
    db.get(query, [nombre, contraseña], (err, usuario) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos.' });
        }
        if (usuario) {
            // Registrar inicio de sesión
            const now = new Date().toISOString();
            const insertSessionQuery = `
                INSERT INTO Sesiones (ingreso, id_usuario)
                VALUES (?, ?)
            `;
            db.run(insertSessionQuery, [now, usuario.id], (err) => {
                if (err) {
                    console.error('Error al registrar inicio de sesión:', err.message);
                }
            });

            res.status(200).json({
                message: 'Inicio de sesión exitoso.',
                usuario,
                panel: usuario.rol === 'dueño' ? 'admin' : 'empleado',
            });
        } else {
            res.status(401).json({ message: 'Credenciales incorrectas.' });
        }
    });
});

// **API: Cierre de sesión**
app.post('/api/logout', (req, res) => {
    const { id_usuario, egreso } = req.body;

    const query = `
        UPDATE Sesiones
        SET egreso = ?
        WHERE id_usuario = ? AND egreso IS NULL
    `;
    db.run(query, [egreso, id_usuario], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al registrar cierre de sesión.' });
        }
        res.status(200).json({ message: 'Cierre de sesión registrado.' });
    });
});

// **API: Producción**
app.post('/api/produccion', async (req, res) => {
    try {
        const { error } = productionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const db = await dbPromise;
        const { id_usuario, producto, sector, cantidad, unidad } = req.body;

        const userExists = await db.get('SELECT id FROM Usuarios WHERE id = ?', [id_usuario]);
        if (!userExists) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const query = `
            INSERT INTO Produccion (producto, sector, fecha_hora, cantidad, unidad, usuario, id_usuario)
            VALUES (?, ?, datetime('now'), ?, ?, (SELECT nombre FROM Usuarios WHERE id = ?), ?)
        `;

        await db.run(query, [producto, sector, cantidad, unidad, id_usuario, id_usuario]);
        res.status(201).json({ message: 'Producción añadida correctamente.' });
    } catch (err) {
        console.error('Error al insertar producción:', err.message);
        res.status(500).json({ error: 'Error al insertar producción.' });
    }
});

app.put('/api/produccion/:id', (req, res) => {
    const { id } = req.params;
    const { producto, sector, cantidad, unidad } = req.body;

    if (!producto || !sector || !cantidad || !unidad) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const query = `
        UPDATE Produccion
        SET producto = ?, sector = ?, cantidad = ?, unidad = ?
        WHERE id = ?
    `;

    db.run(query, [producto, sector, cantidad, unidad, id], function (err) {
        if (err) {
            console.error('Error al actualizar producción:', err.message);
            return res.status(500).json({ error: 'Error al actualizar producción.' });
        }
        res.status(200).json({ message: 'Producción actualizada correctamente.' });
    });
});

app.get('/api/produccion', (req, res) => {
    const id_usuario = req.query.id_usuario;
    const query = `
        SELECT producto, sector, fecha_hora, cantidad, unidad, usuario
        FROM Produccion
        WHERE id_usuario = ?;
    `;
    db.all(query, [id_usuario], (err, rows) => {
        if (err) {
            console.error('Error al obtener producción:', err.message);
            return res.status(500).json({ error: 'Error al obtener producción.' });
        }
        res.json(rows);
    });
});

app.delete('/api/produccion/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM Produccion WHERE id = ?`;
    db.run(query, [id], function (err) {
        if (err) {
            console.error('Error al eliminar producción:', err.message);
            return res.status(500).json({ error: 'Error al eliminar producción.' });
        }
        res.status(200).json({ message: 'Producción eliminada correctamente.' });
    });
});

// **API: Obtener Producción por ID (Editar Producción)**
app.get('/api/produccion/:id', (req, res) => {
    const { id } = req.params;

    const query = `SELECT * FROM Produccion WHERE id = ?`;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error al obtener producción:', err.message);
            return res.status(500).json({ error: 'Error al obtener producción.' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Producción no encontrada.' });
        }
        res.json(row);
    });
});

// **API: Ventas**
app.post('/api/ventas', async (req, res) => {
    try {
        const { error } = saleSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const db = await dbPromise;
        const { id_producto, cantidad, precio, metodo_pago, sector, id_usuario, fecha_hora } = req.body;

        const productExists = await db.get('SELECT cantidad_disponible FROM Productos WHERE id = ?', [id_producto]);
        if (!productExists) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        if (productExists.cantidad_disponible < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente.' });
        }

        const userExists = await db.get('SELECT id FROM Usuarios WHERE id = ?', [id_usuario]);
        if (!userExists) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const queryInsertVenta = `
            INSERT INTO Ventas (id_producto, cantidad, precio, metodo_pago, sector, id_usuario, fecha_hora)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.run(queryInsertVenta, [id_producto, cantidad, precio, metodo_pago, sector, id_usuario, fecha_hora]);

        const queryUpdateStock = `
            UPDATE Productos
            SET cantidad_disponible = cantidad_disponible - ?
            WHERE id = ?
        `;

        await db.run(queryUpdateStock, [cantidad, id_producto]);
        res.status(200).json({ message: 'Venta registrada y stock actualizado.' });
    } catch (err) {
        console.error('Error al registrar venta:', err.message);
        res.status(500).json({ error: 'Error al registrar venta.' });
    }
});

app.get('/api/ventas', (req, res) => {
    const id_usuario = req.query.id_usuario;
    const query = `
        SELECT v.id, p.nombre AS producto, v.sector, v.fecha_hora, v.precio, v.metodo_pago, v.cantidad
        FROM Ventas v
        JOIN Productos p ON v.id_producto = p.id
        WHERE v.id_usuario = ?;
    `;
    db.all(query, [id_usuario], (err, rows) => {
        if (err) {
            console.error('Error al obtener ventas:', err.message);
            return res.status(500).json({ error: 'Error al obtener ventas.' });
        }
        res.json(rows);
    });
});
// **API: Obtener Venta por ID (Editar Venta)**
app.get('/api/ventas/:id', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT v.id, v.sector, v.cantidad, v.metodo_pago, p.nombre AS producto, p.id AS id_producto
        FROM Ventas v
        JOIN Productos p ON v.id_producto = p.id
        WHERE v.id = ?;
    `;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error al obtener venta:', err.message);
            return res.status(500).json({ error: 'Error al obtener venta.' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }
        res.json(row);
    });
});

app.put('/api/ventas/:id', (req, res) => {
    const { id } = req.params;
    const { id_producto, cantidad, metodo_pago, sector } = req.body;

    const queryUpdateVenta = `
        UPDATE Ventas
        SET id_producto = ?, cantidad = ?, metodo_pago = ?, sector = ?
        WHERE id = ?
    `;

    db.run(queryUpdateVenta, [id_producto, cantidad, metodo_pago, sector, id], (err) => {
        if (err) {
            console.error('Error al actualizar venta:', err.message);
            return res.status(500).json({ error: 'Error al actualizar venta.' });
        }
        res.status(200).json({ message: 'Venta actualizada correctamente.' });
    });
});

// **API: Tareas**
app.post('/api/tareas', (req, res) => {
    const { nombre_tarea, id_usuario, dia_creada, observaciones } = req.body;

    if (!nombre_tarea || !id_usuario || !dia_creada) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const query = `
        INSERT INTO Tareas (nombre_tarea, id_usuario, dia_creada, observaciones)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [nombre_tarea, id_usuario, dia_creada, observaciones || ''], function (err) {
        if (err) {
            console.error('Error al crear tarea:', err.message);
            return res.status(500).json({ error: 'Error al crear tarea.' });
        }
        res.status(200).json({ message: 'Tarea creada correctamente.', tarea_id: this.lastID });
    });
});

app.get('/api/tareas', (req, res) => {
    const id_usuario = req.query.id_usuario;
    const query = `
        SELECT t.id, t.nombre_tarea, t.observaciones, t.dia_creada, u.nombre AS usuario
        FROM Tareas t
        JOIN Usuarios u ON t.id_usuario = u.id
        WHERE t.id_usuario = ?;
    `;
    db.all(query, [id_usuario], (err, rows) => {
        if (err) {
            console.error('Error al obtener tareas:', err.message);
            return res.status(500).json({ error: 'Error al obtener tareas.' });
        }
        res.json(rows);
    });
});

app.delete('/api/tareas/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM Tareas WHERE id = ?`;
    db.run(query, [id], function (err) {
        if (err) {
            console.error('Error al eliminar tarea:', err.message);
            return res.status(500).json({ error: 'Error al eliminar tarea.' });
        }
        res.status(200).json({ message: 'Tarea completada y eliminada correctamente.' });
    });
});

// **API: Productos**
app.get('/api/productos', (req, res) => {
    const query = `SELECT * FROM Productos WHERE cantidad_disponible > 0;`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos:', err.message);
            return res.status(500).json({ error: 'Error al obtener productos.' });
        }
        res.json(rows);
    });
});

// **API: Materia Prima**
// Actualizar una Materia Prima
app.put('/api/materia-prima/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, cantidad, unidad, precio_compra } = req.body;

    const query = `
        UPDATE MateriaPrima
        SET nombre = ?, cantidad = ?, unidad = ?, precio_compra = ?
        WHERE id = ?
    `;
    db.run(query, [nombre, cantidad, unidad, precio_compra, id], function (err) {
        if (err) {
            console.error('Error al actualizar materia prima:', err.message);
            return res.status(500).json({ error: 'Error al actualizar materia prima.' });
        }
        res.status(200).json({ message: 'Materia prima actualizada correctamente.' });
    });
});

// Eliminar una Materia Prima
app.delete('/api/materia-prima/:id', (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM MateriaPrima WHERE id = ?`;
    db.run(query, [id], function (err) {
        if (err) {
            console.error('Error al eliminar materia prima:', err.message);
            return res.status(500).json({ error: 'Error al eliminar materia prima.' });
        }
        res.status(200).json({ message: 'Materia prima eliminada correctamente.' });
    });
});

// Agregar una nueva Materia Prima
app.post('/api/materia-prima', (req, res) => {
    const { nombre, cantidad, unidad, precio_compra, fecha_hora } = req.body;

    const query = `
        INSERT INTO MateriaPrima (nombre, cantidad, unidad, precio_compra, fecha_hora)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.run(query, [nombre, cantidad, unidad, precio_compra, fecha_hora], function (err) {
        if (err) {
            console.error('Error al agregar materia prima:', err.message);
            return res.status(500).json({ error: 'Error al agregar materia prima.' });
        }
        res.status(200).json({ message: 'Materia prima añadida correctamente.' });
    });
});

app.get('/api/materia-prima', (req, res) => {
    const query = `SELECT * FROM MateriaPrima;`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener materia prima:', err.message);
            return res.status(500).json({ error: 'Error al obtener materia prima.' });
        }
        res.json(rows);
    });
});

// **API: Obtener Materia Prima por ID (Editar Materia Prima)**
app.get('/api/materia-prima/:id', (req, res) => {
    const { id } = req.params;

    const query = `SELECT * FROM MateriaPrima WHERE id = ?`;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error al obtener materia prima:', err.message);
            return res.status(500).json({ error: 'Error al obtener materia prima.' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Materia prima no encontrada.' });
        }
        res.json(row);
    });
});

// **API: Usuarios (Admin)**
app.get('/api/admin/usuarios', (req, res) => {
    const query = `
        SELECT u.id, u.nombre, 
               COALESCE(MAX(s.ingreso), 'N/A') AS ultimo_ingreso, 
               COALESCE(MAX(s.egreso), 'N/A') AS ultimo_egreso
        FROM Usuarios u
        LEFT JOIN Sesiones s ON u.id = s.id_usuario
        GROUP BY u.id;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener usuarios (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener usuarios.' });
        }
        res.json(rows);
    });
});

app.post('/api/admin/usuarios', async (req, res) => {
    try {
        const { error } = userSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const db = await dbPromise;
        const { nombre, rol, contraseña } = req.body;

        const userExists = await db.get('SELECT id FROM Usuarios WHERE nombre = ?', [nombre]);
        if (userExists) {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
        }

        const query = `INSERT INTO Usuarios (nombre, rol, contraseña) VALUES (?, ?, ?)`;
        await db.run(query, [nombre, rol, contraseña]);
        res.status(200).json({ message: 'Usuario agregado correctamente.' });
    } catch (err) {
        console.error('Error al agregar usuario:', err.message);
        res.status(500).json({ error: 'Error al agregar usuario.' });
    }
});

// **API: Empleados (Admin)**
app.get('/api/admin/empleados', (req, res) => {
    const query = `SELECT id, nombre FROM Usuarios WHERE rol = 'empleado';`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener empleados:', err.message);
            return res.status(500).json({ error: 'Error al obtener empleados.' });
        }
        res.json(rows);
    });
});

app.get('/api/admin/empleados', (req, res) => {
    const query = `
        SELECT id, nombre, sector 
        FROM Usuarios 
        WHERE rol = 'empleado';
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener empleados:', err.message);
            return res.status(500).json({ error: 'Error al obtener empleados.' });
        }
        res.json(rows);
    });
});

// **API: Producción (Admin)**
app.get('/api/admin/produccion', (req, res) => {
    const query = `
        SELECT pr.id, pr.producto, pr.sector, pr.fecha_hora, pr.cantidad, pr.unidad, u.nombre AS usuario
        FROM Produccion pr
        JOIN Usuarios u ON pr.id_usuario = u.id;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener producción (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener producción.' });
        }
        res.json(rows);
    });
});

// **API: Productos (Admin)**
app.get('/api/admin/productos', (req, res) => {
    const query = `SELECT * FROM Productos;`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener productos.' });
        }
        res.json(rows);
    });
});

app.post('/api/admin/productos', (req, res) => {
    const { nombre, sector, cantidad_disponible, unidad, precio_unitario, precio_venta } = req.body;
    if (!nombre || !sector || !cantidad_disponible || !unidad || !precio_unitario || !precio_venta) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const query = `
        INSERT INTO Productos (nombre, sector, cantidad_disponible, unidad, precio_unitario, precio_venta)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [nombre, sector, cantidad_disponible, unidad, precio_unitario, precio_venta], function (err) {
        if (err) {
            console.error('Error al agregar producto:', err.message);
            return res.status(500).json({ error: 'Error al agregar producto.' });
        }
        res.status(200).json({ message: 'Producto agregado correctamente.' });
    });
});

app.put('/api/productos/:id', (req, res) => {
    const { id } = req.params;
    const { cantidad_disponible } = req.body;

    const query = `UPDATE Productos SET cantidad_disponible = ? WHERE id = ?`;
    db.run(query, [cantidad_disponible, id], function (err) {
        if (err) {
            console.error('Error al actualizar producto:', err.message);
            return res.status(500).json({ error: 'Error al actualizar producto.' });
        }
        res.status(200).json({ message: 'Producto actualizado correctamente.' });
    });
});

// **API: Materia Prima (Admin)**
app.get('/api/admin/materia-prima', (req, res) => {
    const query = `SELECT * FROM MateriaPrima;`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener materia prima (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener materia prima.' });
        }
        res.json(rows);
    });
});

app.post('/api/admin/materia-prima', (req, res) => {
    const { nombre, cantidad, unidad, precio_compra, fecha_hora } = req.body;
    if (!nombre || !cantidad || !unidad || !precio_compra || !fecha_hora) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const query = `
        INSERT INTO MateriaPrima (nombre, cantidad, unidad, precio_compra, fecha_hora)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.run(query, [nombre, cantidad, unidad, precio_compra, fecha_hora], function (err) {
        if (err) {
            console.error('Error al agregar materia prima:', err.message);
            return res.status(500).json({ error: 'Error al agregar materia prima.' });
        }
        res.status(200).json({ message: 'Materia prima agregada correctamente.' });
    });
});

// **API: Ventas (Admin)**
app.get('/api/admin/ventas', (req, res) => {
    const query = `
        SELECT 
            v.id, 
            p.nombre AS producto, 
            v.sector, 
            v.fecha_hora, 
            v.precio, 
            v.metodo_pago, 
            v.cantidad, 
            (v.precio * v.cantidad) AS total, 
            u.nombre AS usuario
        FROM Ventas v
        JOIN Productos p ON v.id_producto = p.id
        JOIN Usuarios u ON v.id_usuario = u.id;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener ventas (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener ventas.' });
        }
        res.json(rows);
    });
});

app.delete('/api/ventas/:id', (req, res) => {
    const { id } = req.params;

    const queryDeleteVenta = `DELETE FROM Ventas WHERE id = ?`;
    db.run(queryDeleteVenta, [id], function (err) {
        if (err) {
            console.error('Error al eliminar venta:', err.message);
            return res.status(500).json({ error: 'Error al eliminar venta.' });
        }
        res.status(200).json({ message: 'Venta eliminada correctamente.' });
    });
});

app.get('/api/sesiones', async (req, res) => {
    try {
        const { id_usuario } = req.query;
        if (!id_usuario) {
            return res.status(400).json({ error: 'id_usuario es obligatorio.' });
        }

        const db = await dbPromise;
        const sesiones = await db.all(
            'SELECT ingreso, egreso FROM Sesiones WHERE id_usuario = ? ORDER BY ingreso DESC',
            [id_usuario]
        );

        res.json(sesiones);
    } catch (err) {
        console.error('Error al cargar sesiones:', err.message);
        res.status(500).json({ error: 'Error al cargar sesiones.' });
    }
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0',() => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
