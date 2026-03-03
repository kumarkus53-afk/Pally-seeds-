import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("pally_seeds.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT CHECK(role IN ('farmer', 'dealer', 'admin')),
    location TEXT,
    land_detail TEXT,
    kyc_status TEXT DEFAULT 'pending',
    credit_limit REAL DEFAULT 0,
    used_credit REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    description TEXT,
    price_retail REAL,
    price_dealer REAL,
    min_dealer_qty INTEGER,
    stock INTEGER,
    image_url TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS education_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    category TEXT,
    content TEXT,
    video_url TEXT
  );
`);

// Migration: Ensure email and password columns exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN email TEXT UNIQUE").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN password TEXT").run();
} catch (e) {}

// Seed initial data if empty
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productCount.count === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, description, price_retail, price_dealer, min_dealer_qty, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProduct.run("Paddy 1509", "Kharif", "High yield basmati variety", 2200, 1900, 20, 500, "https://picsum.photos/seed/paddy/400/300");
  insertProduct.run("Wheat HD 2967", "Rabi", "Popular high yield wheat", 1800, 1500, 50, 1000, "https://picsum.photos/seed/wheat/400/300");
  insertProduct.run("Tomato Hybrid", "Vegetable", "Disease resistant tomato seeds", 150, 120, 10, 200, "https://picsum.photos/seed/tomato/400/300");
}

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE email = ?").get("kumarkus53@gmail.com");
if (!adminExists) {
  // Check if an admin with this role already exists but no email (legacy)
  const legacyAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin' AND email IS NULL").get();
  if (legacyAdmin) {
    db.prepare("UPDATE users SET email = ?, password = ?, name = ? WHERE id = ?").run(
      "kumarkus53@gmail.com",
      "Lucky@raj1",
      "Admin",
      legacyAdmin.id
    );
  } else {
    db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
      "kumarkus53@gmail.com",
      "Lucky@raj1",
      "Admin",
      "admin"
    );
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products WHERE is_active = 1").all();
    res.json(products);
  });

  app.get("/api/user/:phone", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(req.params.phone);
    res.json(user || null);
  });

  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ? AND role = 'admin'").get(email, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid admin credentials" });
    }
  });

  app.post("/api/register", (req, res) => {
    const { phone, name, role, location } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (phone, name, role, location) VALUES (?, ?, ?, ?)").run(phone, name, role, location);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "User already exists or invalid data" });
    }
  });

  app.post("/api/orders", (req, res) => {
    const { userId, items, totalAmount } = req.body;
    const transaction = db.transaction(() => {
      const orderInfo = db.prepare("INSERT INTO orders (user_id, total_amount) VALUES (?, ?)").run(userId, totalAmount);
      const orderId = orderInfo.lastInsertRowid;
      
      const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
      for (const item of items) {
        insertItem.run(orderId, item.id, item.quantity, item.price);
        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
      }
      return orderId;
    });
    
    try {
      const orderId = transaction();
      res.json({ success: true, orderId });
    } catch (e) {
      res.status(500).json({ error: "Failed to place order" });
    }
  });

  app.get("/api/orders/:userId", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, GROUP_CONCAT(p.name || ' (x' || oi.quantity || ')') as items_summary
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all(req.params.userId);
    res.json(orders);
  });

  app.get("/api/admin/stats", (req, res) => {
    const totalSales = db.prepare("SELECT SUM(total_amount) as total FROM orders").get() as { total: number };
    const orderCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    const topProducts = db.prepare(`
      SELECT p.name, SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `).all();
    
    res.json({
      totalSales: totalSales.total || 0,
      orderCount: orderCount.count,
      userCount: userCount.count,
      topProducts
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
