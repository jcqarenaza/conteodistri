const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const supabase = require('../supabase');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user)
    return res.status(401).json({ error: 'Usuario no encontrado' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok)
    return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign(
    { id: user.id, username: user.username, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, rol: user.rol } });
});

// POST /api/auth/register (solo admin puede crear usuarios)
router.post('/register', async (req, res) => {
  const { username, password, rol = 'operador' } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Datos incompletos' });

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('usuarios')
    .insert({ username, password: hash, rol })
    .select('id, username, rol')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
