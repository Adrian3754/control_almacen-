export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(',') + '\n';
  const body = rows.map(r => keys.map(k => {
    const v = r[k] ?? '';
    const safe = String(v).replace(/"/g, '""');
    if (safe.search(/,|\n|\"/) >= 0) return `"${safe}"`;
    return safe;
  }).join(',')).join('\n');

  const csv = header + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function registrosToExportRows(items: any[]) {
  return items.map(r => ({
    numeroPesaje: r.numeroPesaje,
    fecha: r.fecha,
    nombre: r.nombre,
    lote: r.lote,
    producto: r.producto ?? '',
    peso: Number(r.peso).toFixed(2),
  }));
}

export function operatorSummaryRows(totales: { nombre: string; count: number; peso: number }[]) {
  const rows = totales.map((t) => ({
    Operador: t.nombre,
    Pesajes: t.count,
    TotalKG: Number(t.peso).toFixed(2),
  }));

  const totalPesajes = totales.reduce((sum, t) => sum + t.count, 0);
  const totalKilos = totales.reduce((sum, t) => sum + t.peso, 0);

  rows.push({
    Operador: 'TOTAL',
    Pesajes: totalPesajes,
    TotalKG: Number(totalKilos).toFixed(2),
  });

  return rows;
}
