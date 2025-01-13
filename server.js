import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';

const app = express();
const PORT = 4000;

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
app.use(express.static(path.join(path.resolve(), 'frontend')));
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Sirve el archivo HTML principal
});

// API: Inicio de sesión
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

            res.status(200).json({ message: 'Inicio de sesión exitoso.',
                 usuario,
                panel: usuario.rol === 'dueño' ? 'admin' : 'empleado' });
        } else {
            res.status(401).json({ message: 'Credenciales incorrectas.' });
        }
    });
});

// API: cierre sesión
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

// API para Produccion
app.post('/api/produccion', (req, res) => {
    const { id_usuario, sector, producto, cantidad, unidad } = req.body;

    if (!id_usuario || !sector || !producto || !cantidad || !unidad) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const now = new Date().toISOString();
    const query = `
        INSERT INTO Produccion (producto, sector, fecha_hora, cantidad, unidad, usuario, id_usuario)
        VALUES (?, ?, ?, ?, ?, (SELECT nombre FROM Usuarios WHERE id = ?), ?)
    `;

    db.run(query, [producto, sector, now, cantidad, unidad, id_usuario, id_usuario], function (err) {
        if (err) {
            console.error('Error al insertar producción:', err.message);
            return res.status(500).json({ error: 'Error al insertar producción' });
        }
        res.status(200).json({ message: 'Producción añadida correctamente' });
    });
});

app.get('/api/produccion', (req, res) => {
    const userId = req.query.id_usuario; // Enviado desde el frontend
    const query = `
        SELECT 
            pr.producto,
            pr.sector,
            pr.fecha_hora,
            pr.cantidad,
            pr.unidad,
            u.nombre AS usuario
        FROM Produccion pr
        JOIN Usuarios u ON pr.id_usuario = u.id
        WHERE pr.id_usuario = ?;
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error al obtener datos de producción:', err.message);
            return res.status(500).json({ error: 'Error al obtener datos de producción'});
        }
        res.json(rows);
    });
});

app.get('/api/admin/produccion', (req, res) => {
    const query = `
           SELECT 
            p.nombre AS id_producto,
            u.nombre AS id_usuario,
            pr.fecha_hora,
            pr.cantidad,
            pr.sector
        FROM Produccion pr
        JOIN Productos p ON pr.id_producto = p.id
        JOIN Usuarios u ON pr.id_usuario = u.id;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener datos de producción (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener datos de producción' });
        }
        res.json(rows);
    });
});

// API para productos

// API para obtener los productos disponibles
app.get('/api/productos', (req, res) => {
    const query = `
        SELECT id, nombre, sector, cantidad_disponible, unidad, precio_venta
        FROM Productos
        WHERE cantidad_disponible > 0;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos disponibles:', err.message);
            return res.status(500).json({ error: 'Error al obtener productos disponibles.' });
        }
        res.json(rows);
    });
});

app.get('/api/admin/productos', (req, res) => {
    const query = `
        SELECT id, nombre, sector, precio_unitario, precio_venta, cantidad_disponible, unidad
        FROM Productos;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos:', err.message);
            return res.status(500).json({ error: 'Error al obtener productos' });
        }
        res.json(rows);
    });
});

app.post('/api/admin/productos', (req, res) => {
    const { nombre, sector, cantidad_disponible, unidad, precio_unitario, precio_venta } = req.body;
    if (!nombre || !sector || !cantidad_disponible || !unidad || !precio_unitario || !precio_venta) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const query = `INSERT INTO Productos (nombre, sector, cantidad_disponible, unidad, precio_venta) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [nombre, sector, cantidad_disponible, unidad, precio_unitario, precio_venta], function (err) {
        if (err) {
            console.error('Error al insertar producto:', err.message);
            return res.status(500).json({ error: 'Error al insertar producto.' });
        }
        res.status(200).json({ message: 'Producto añadido correctamente.' });
    });
});

// API para Ventas
app.post('/api/ventas', (req, res) => {
    const { id_usuario, sector, producto, precio, metodo_pago, cantidad } = req.body;

    if (!id_usuario || !sector || !producto || !precio || !metodo_pago || !cantidad) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const now = new Date().toISOString();
    // Obtener `id_producto` desde la tabla Productos
    const queryProducto = `SELECT id FROM Productos WHERE nombre = ?`;
    db.get(queryProducto, [producto], (err, row) => {
        if (err) {
            console.error('Error al obtener id_producto:', err.message);
            return res.status(500).json({ error: 'Error al obtener producto.' });
        }

        const idProducto = row ? row.id : null;

        if (!idProducto) {
            return res.status(400).json({ error: 'El producto no existe en la base de datos.' });
        }

        // Inserción en la tabla Ventas
        const queryVenta = `
            INSERT INTO Ventas (id_producto, producto, sector, fecha_hora, precio, metodo_pago, cantidad, usuario, id_usuario)
            VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT nombre FROM Usuarios WHERE id = ?), ?)
        `;

        db.run(queryVenta, [idProducto, producto, sector, now, precio, metodo_pago, cantidad, id_usuario, id_usuario], function (err) {
            if (err) {
                console.error('Error al insertar venta:', err.message);
                return res.status(500).json({ error: 'Error al insertar venta.' });
            }
            res.status(200).json({ message: 'Venta añadida correctamente.' });
        });
    });
});

app.get('/api/ventas', (req, res) => {
    const userId = req.query.id_usuario; // Enviado desde el frontend
    const query = `
         SELECT 
            p.nombre AS producto,
            v.sector,
            v.fecha_hora,
            v.cantidad,
            p.precio_unitario,
            v.precio AS precio_venta,
            (v.cantidad * v.precio) AS total,
            u.nombre AS usuario
        FROM Ventas v
        JOIN Productos p ON v.id_producto = p.id
        JOIN Usuarios u ON v.id_usuario = u.id
        WHERE v.id_usuario = ?;
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error al obtener datos de ventas:', err.message);
            return res.status(500).json({ error: 'Error al obtener datos de ventas' });
        }
        res.json(rows);
    });
});

app.get('/api/admin/ventas', (req, res) => {
    const query = `
        SELECT 
            v.producto,
            u.nombre AS usuario,
            v.fecha_hora,
            v.sector,
            v.precio AS precio_venta,
            v.metodo_pago,
            v.cantidad,
            (v.cantidad * v.precio) AS total,
            u.nombre AS usuario
            
        FROM Ventas v
        JOIN Productos p ON v.id_producto = p.id
        JOIN Usuarios u ON v.id_usuario = u.id;
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener datos de ventas (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener datos de ventas' });
        }
        res.json(rows);
    });
});

// API para materia prima
app.post('/api/materia-prima', (req, res) => {
    const { nombre, cantidad, unidad, precio_compra } = req.body;

    if (!nombre || !cantidad || !unidad || !precio_compra) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const now = new Date().toISOString();
    const query = `
        INSERT INTO MateriaPrima (nombre, cantidad, unidad, precio_compra, fecha_hora)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [nombre, cantidad, unidad, precio_compra], function (err) {
        if (err) {
            console.error('Error al insertar materia prima:', err.message);
            return res.status(500).json({ error: 'Error al insertar materia prima' });
        }
        res.status(200).json({ message: 'Materia prima añadida correctamente' });
    });
});

app.get('/api/materia-prima', (req, res) => {
    const query = `
        SELECT id, nombre, cantidad, unidad, fecha_hora
        FROM MateriaPrima;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener materia prima:', err.message);
            return res.status(500).json({ error: 'Error al obtener materia prima' });
        }
        res.json(rows);
    });
});

app.put('/api/materia-prima/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, cantidad, unidad } = req.body;

    const query = `
        UPDATE MateriaPrima
        SET nombre = ?, cantidad = ?, unidad = ?
        WHERE id = ?
    `;

    db.run(query, [nombre, cantidad, unidad, id], function (err) {
        if (err) {
            console.error('Error al actualizar materia prima:', err.message);
            return res.status(500).json({ error: 'Error al actualizar materia prima' });
        }
        res.status(200).json({ message: 'Materia prima actualizada correctamente' });
    });
});

app.delete('/api/materia-prima/:id', (req, res) => {
    const { id } = req.params;

    const query = `
        DELETE FROM MateriaPrima
        WHERE id = ?
    `;

    db.run(query, [id], function (err) {
        if (err) {
            console.error('Error al eliminar materia prima:', err.message);
            return res.status(500).json({ error: 'Error al eliminar materia prima' });
        }
        res.status(200).json({ message: 'Materia prima eliminada correctamente' });
    });
});

app.get('/api/admin/materia-prima', (req, res) => {
    const query = `
        SELECT id, nombre, cantidad, unidad, precio_compra, fecha_hora
        FROM MateriaPrima;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener datos de materia prima (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener datos de materia prima' });
        }
        res.json(rows);
    });
});

// API para Sesiones
app.get('/api/sesiones', (req, res) => {
    const userId = req.query.id_usuario; // Enviado desde el frontend
    const query = `
        SELECT ingreso, egreso
        FROM Sesiones
        WHERE id_usuario = ?;
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/admin/usuarios', (req, res) => {
    const query = `
        SELECT u.id, --Incluye el ID del usuario
            u.nombre,
               COALESCE(MAX(r1.ingreso), 'N/A') AS ultimo_ingreso,
               COALESCE(MAX(r2.egreso), 'N/A') AS ultimo_egreso
        FROM Usuarios u
        LEFT JOIN Sesiones r1 ON r1.id_usuario = u.id
        LEFT JOIN Sesiones r2 ON r2.id_usuario = u.id
        GROUP BY u.id;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener datos de usuarios (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener datos de usuarios' });
        }
        res.json(rows);
    });
});

app.get('/api/admin/empleados', (req, res) => {
    const query = `
        SELECT id, nombre
        FROM Usuarios
        WHERE rol = 'empleado';
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener datos de empleados (admin):', err.message);
            return res.status(500).json({ error: 'Error al obtener datos de empleados' });
        }
        res.json(rows);
    });
});

// Ruta para agregar usuarios
app.post('/api/admin/usuarios', (req, res) => {
    const { nombre, rol, contraseña } = req.body;
    if (!nombre || !rol || !contraseña) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const query = `INSERT INTO Usuarios (nombre, rol, contraseña) VALUES (?, ?, ?)`;
    db.run(query, [nombre, rol, contraseña], function (err) {
        if (err) {
            console.error('Error al insertar usuario:', err.message);
            return res.status(500).json({ error: 'Error al insertar usuario.' });
        }
        res.status(200).json({ message: 'Usuario añadido correctamente.' });
    });
});

// API para agregar una nueva tarea
app.post('/api/admin/tareas', (req, res) => {
    const { nombre_tarea, id_usuario, dia_creada, observaciones } = req.body;

    if (!nombre_tarea || !id_usuario || !dia_creada) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const query = `
        INSERT INTO Tareas (nombre_tarea, id_usuario, dia_creada, observaciones)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [nombre_tarea, id_usuario, observaciones || '', dia_creada], function (err) {
        if (err) {
            console.error('Error al insertar tarea:', err.message);
            return res.status(500).json({ error: 'Error al insertar tarea.' });
        }
        res.status(200).json({ message: 'Tarea añadida correctamente.', tarea_id: this.lastID });
    });
});

// API para obtener todas las tareas
app.get('/api/admin/tareas', (req, res) => {
    const userId = req.query.id_usuario;
    const query = `
        SELECT 
            t.id,
            t.nombre_tarea,
            u.nombre AS usuario,
            t.observaciones,
            t.dia_creada
        FROM Tareas t
        JOIN Usuarios u ON t.id_usuario = u.id
        WHERE t.id_usuario = ?; -- Filtra por id_usuario
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error al obtener tareas:', err.message);
            return res.status(500).json({ error: 'Error al obtener tareas.' });
        }
        res.json(rows);
    });
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0',() => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
