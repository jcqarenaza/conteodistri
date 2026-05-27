const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { parse } = require('csv-parse/sync');
const supabase = require('../supabase');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── STOCK SISTEMA ─────────────────────────────────────────────────

// GET /api/stock/sistema/:dep
router.get('/sistema/:dep', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('stock_sistema')
    .select('codigo, stock, fuente, sincronizado_at')
    .eq('deposito', req.params.dep);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/stock/sistema/csv — importar CSV
router.post('/sistema/csv', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  const { dep } = req.body;
  if (!dep) return res.status(400).json({ error: 'Deposito requerido' });

  const text = req.file.buffer.toString('utf-8');
  const sep  = text.includes(';') ? ';' : ',';

  let rows;
  try {
    rows = parse(text, { delimiter: sep, columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    return res.status(400).json({ error: 'CSV inválido: ' + e.message });
  }

  // Normalizar columnas
  const upserts = [];
  const errores = [];
  rows.forEach(row => {
    const cod   = (row.codigo || row.Codigo || row.CODIGO || '').trim().toUpperCase();
    const stk   = parseInt(row.stock || row.Stock || row.STOCK || row.cantidad || 0);
    if (!cod) return;
    if (isNaN(stk)) { errores.push(cod); return; }
    upserts.push({ deposito: dep, codigo: cod, stock: stk, fuente: 'csv', sincronizado_at: new Date() });
  });

  if (!upserts.length) return res.status(400).json({ error: 'Sin filas válidas', errores });

  const { error } = await supabase
    .from('stock_sistema')
    .upsert(upserts, { onConflict: 'deposito,codigo' });

  if (error) return res.status(500).json({ error: error.message });

  // Log
  await supabase.from('movimientos').insert({
    deposito: dep, codigo: null, tipo: 'import_csv',
    detalle: JSON.stringify({ cantidad: upserts.length, errores: errores.length }),
    usuario_id: req.user.id
  });

  res.json({ importados: upserts.length, errores });
});

// ── CONTEOS ──────────────────────────────────────────────────────

// GET /api/stock/conteos/:dep
router.get('/conteos/:dep', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('stock_conteos')
    .select('*')
    .eq('deposito', req.params.dep);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/stock/conteos/:dep/:codigo
router.put('/conteos/:dep/:codigo', authMiddleware, async (req, res) => {
  const { dep, codigo } = req.params;
  const { cant_ubicacion, cant_pulmon, cant_aoki } = req.body;

  const { data, error } = await supabase
    .from('stock_conteos')
    .upsert({
      deposito: dep, codigo,
      cant_ubicacion, cant_pulmon, cant_aoki,
      updated_at: new Date(),
      usuario_id: req.user.id
    }, { onConflict: 'deposito,codigo' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log conteo
  await supabase.from('movimientos').insert({
    deposito: dep, codigo, tipo: 'conteo',
    detalle: JSON.stringify({ cant_ubicacion, cant_pulmon, cant_aoki }),
    usuario_id: req.user.id
  });

  res.json(data);
});

module.exports = router;
