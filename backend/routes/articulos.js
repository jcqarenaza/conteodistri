const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

// GET /api/articulos/:dep
router.get('/:dep', authMiddleware, async (req, res) => {
  const { dep } = req.params;
  const { q, marca, con_pulmon } = req.query;

  let query = supabase
    .from('articulos')
    .select('*')
    .eq('deposito', dep)
    .order('codigo');

  if (q)        query = query.ilike('codigo', `%${q}%`);
  if (marca)    query = query.eq('marca', marca);
  if (con_pulmon === '1') query = query.not('ubicacion_pulmon', 'is', null);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/articulos/:dep/:codigo — editar ubicación
router.put('/:dep/:codigo', authMiddleware, async (req, res) => {
  const { dep, codigo } = req.params;
  const { ubicacion, ubicacion_pulmon } = req.body;

  const { data, error } = await supabase
    .from('articulos')
    .update({ ubicacion, ubicacion_pulmon, updated_at: new Date() })
    .eq('deposito', dep)
    .eq('codigo', codigo)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log movimiento
  await supabase.from('movimientos').insert({
    deposito: dep,
    codigo,
    tipo: 'edicion_ubicacion',
    detalle: JSON.stringify({ ubicacion, ubicacion_pulmon }),
    usuario_id: req.user.id
  });

  res.json(data);
});

module.exports = router;
