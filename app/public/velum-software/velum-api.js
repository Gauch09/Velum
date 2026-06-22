// ────────────────────────────────────────────────────────────────────────
// VelumAPI · puente de las pantallas .dc.html con velum-produccion.
// Reemplaza localStorage por fetch() a /api/velum/* (mismo origen).
//   VelumAPI.get(tabla[, params])  → array (lo que devolvía localStorage)
//   VelumAPI.save(tabla, registro) → upsert de un registro
//   VelumAPI.del(tabla, id)        → borra por id
//   VelumAPI.poll(tabla, cb, ms)   → refresco simple para "tiempo real"
// ────────────────────────────────────────────────────────────────────────
(function () {
  var BASE = '/api/velum';

  function url(tabla, params) {
    var u = BASE + '/' + tabla;
    if (params) {
      var q = new URLSearchParams(params).toString();
      if (q) u += '?' + q;
    }
    return u;
  }

  async function get(tabla, params) {
    var r = await fetch(url(tabla, params), { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('GET ' + tabla + ' → ' + r.status);
    return r.json();
  }

  async function save(tabla, registro) {
    var r = await fetch(BASE + '/' + tabla, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(registro)
    });
    if (!r.ok) throw new Error('POST ' + tabla + ' → ' + r.status);
    return r.json();
  }

  async function del(tabla, id) {
    var r = await fetch(BASE + '/' + tabla + '?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (!r.ok) throw new Error('DELETE ' + tabla + ' → ' + r.status);
    return r.json();
  }

  // Refresco por polling (simple, sin dependencias). Devuelve función para frenar.
  function poll(tabla, cb, ms, params) {
    var stop = false;
    async function tick() {
      if (stop) return;
      try { cb(await get(tabla, params)); } catch (e) { /* silencioso */ }
      if (!stop) setTimeout(tick, ms || 4000);
    }
    setTimeout(tick, ms || 4000);
    return function () { stop = true; };
  }

  // Matcheo robusto capacidad↔pieza (compartido por todas las pantallas).
  // Normaliza mayúsculas/tildes/espacios y matchea en ambos sentidos:
  //   exacto > nombre-de-producto contenido en la pieza (más específico) >
  //   nombre-de-pieza contenido en el producto (más cercano).
  function normName(s) {
    return (s == null ? '' : String(s)).toLowerCase().replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function matchCap(caps, name) {
    caps = caps || [];
    var nm = normName(name);
    if (!nm) return null;
    var exact = null, fwd = null, fwdLen = -1, rev = null, revLen = Infinity;
    for (var i = 0; i < caps.length; i++) {
      var p = caps[i]; var pn = normName(p && p.nombre); if (!pn) continue;
      if (pn === nm) { exact = p; break; }
      if (nm.indexOf(pn) >= 0) { if (pn.length > fwdLen) { fwdLen = pn.length; fwd = p; } }
      else if (pn.indexOf(nm) >= 0) { if (pn.length < revLen) { revLen = pn.length; rev = p; } }
    }
    return exact || fwd || rev;
  }

  window.VelumAPI = { get: get, save: save, del: del, poll: poll, normName: normName, matchCap: matchCap, BASE: BASE };
})();
