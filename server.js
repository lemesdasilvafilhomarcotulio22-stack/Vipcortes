// server.js - backend completo VipCortes (MySQL local)
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const app = express();
const PORT = 10000;

// ----------- Middleware -----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.')); // serve HTML/CSS/JS da mesma pasta

// ----------- Conexão MySQL -----------
const db = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vipcortes'
});

// ----------- Criar tabelas se não existirem -----------
await db.execute(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20)
);
`);

await db.execute(`
CREATE TABLE IF NOT EXISTS agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INT,
  phone VARCHAR(20),
  service VARCHAR(100),
  data_agendamento DATE,
  hora TIME,
  observacoes TEXT
);
`);

await db.execute(`
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_name VARCHAR(100),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

await db.execute(`
CREATE TABLE IF NOT EXISTS fidelidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  pontos INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ativo'
);
`);

// ----------- Rotas API -----------

// Signup
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO usuarios (name,email,password,phone) VALUES (?,?,?,?)',
      [name, email, hash, phone]
    );
    res.json({ message: 'Usuário criado com sucesso!', userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Erro ao criar usuário. Email pode já estar cadastrado.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = rows[0];
    const match = await bcrypt.compare(senha, user.password);
    if (!match) return res.status(401).json({ error: 'Senha incorreta' });

    res.json({ message: 'Login realizado com sucesso', userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no login' });
  }
});

// Criar agendamento (sem usuário vinculado)
app.post('/api/agendamentos', async (req, res) => {
  try {
    const { name, age, phone, service, date, time, observacoes } = req.body;

    await db.execute(
      `INSERT INTO agendamentos (name, age, phone, service, data_agendamento, hora, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, age, phone, service, date, time, observacoes || null]
    );

    res.json({ message: 'Agendamento criado com sucesso' });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Listar agendamentos
app.get('/api/agendamentos', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM agendamentos ORDER BY data_agendamento, hora');
    res.json({ appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

// Excluir agendamento
app.delete('/api/agendamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM agendamentos WHERE id = ?', [id]);
    res.json({ message: 'Agendamento excluído com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

// Reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json({ reviews: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar avaliações' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { author_name, content } = req.body;
    await db.execute(
      'INSERT INTO reviews (author_name, content) VALUES (?, ?)',
      [author_name || 'Anônimo', content]
    );
    res.json({ message: 'Avaliação enviada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar avaliação' });
  }
});

// Fidelidade - cancelar cartão
app.post('/api/fidelities/:userId/cancel', async (req, res) => {
  try {
    const { userId } = req.params;
    await db.execute('UPDATE fidelidades SET status="cancelado" WHERE usuario_id=?', [userId]);
    res.json({ message: 'Cartão fidelidade cancelado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar cartão' });
  }
});

// ----------- Servir frontend -----------
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// ----------- Iniciar servidor -----------
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}/`);
});
