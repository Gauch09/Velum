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

  window.VelumAPI = { get: get, save: save, del: del, poll: poll, BASE: BASE };
})();
