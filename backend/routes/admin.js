const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/admin/config/:dep
router.get('/config/:dep', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('admin_config_dep')
    .select('clave, valor')
    .eq('deposito', req.params.dep);
  if (error) return res.status(500).json({ error: error.message });

  const cfg = {};
  data.forEach(r => { cfg[r.clave] = r.valor; });

  // Config global (marcas deshabilitadas)
  const { data: global } = await supabase
    .from('admin_config')
    .select('clave, valor');
  (global || []).forEach(r => { cfg[r.clave] = r.valor; });

  res.json(cfg);
});

// PUT /api/admin/config/:dep
router.put('/config/:dep', authMiddleware, adminOnly, async (req, res) => {
  const { dep } = req.params;
  const { clave, valor, global: isGlobal } = req.body;

  if (isGlobal) {
    await supabase.from('admin_config')
      .upsert({ clave, valor }, { onConflict: 'clave' });
  } else {
    await supabase.from('admin_config_dep')
      .upsert({ deposito: dep, clave, valor }, { onConflict: 'deposito,clave' });
  }
  res.json({ ok: true });
});

// GET /api/admin/movimientos/:dep
router.get('/movimientos/:dep', authMiddleware, adminOnly, async (req, res) => {
  const { limit = 100, tipo } = req.query;
  let query = supabase
    .from('movimientos')
    .select('*, usuarios(username)')
    .eq('deposito', req.params.dep)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (tipo) query = query.eq('tipo', tipo);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/admin/alertas/:dep
router.get('/alertas/:dep', authMiddleware, async (req, res) => {
  const dep = req.params.dep;

  // Trae artículos con min/max configurado
  const { data: minmax } = await supabase
    .from('admin_config_dep')
    .select('valor')
    .eq('deposito', dep)
    .eq('clave', 'ubicMinMax')
    .single();

  const cfg = minmax?.valor || {};
  const codigos = Object.keys(cfg).filter(c => cfg[c].min != null);

  if (!codigos.length) return res.json([]);

  // Trae conteos actuales
  const { data: conteos } = await supabase
    .from('stock_conteos')
    .select('codigo, cant_ubicacion, cant_pulmon, cant_aoki')
    .eq('deposito', dep)
    .in('codigo', codigos);

  const conteoMap = {};
  (conteos || []).forEach(c => { conteoMap[c.codigo] = c; });

  const alertas = codigos
    .map(cod => {
      const c = conteoMap[cod] || {};
      const stock = (c.cant_ubicacion || 0) + (c.cant_pulmon || 0) + (c.cant_aoki || 0);
      const { min, max } = cfg[cod];
      if (stock < min) return { codigo: cod, stock, min, max, diferencia: min - stock };
      return null;
    })
    .filter(Boolean);

  res.json(alertas);
});

module.exports = router;
