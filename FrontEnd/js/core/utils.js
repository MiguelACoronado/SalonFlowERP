/* Utilidades compartidas por vistas y modelos. */
(function (SF) {
  var MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  SF.util.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  };
  SF.util.money = function (n) {
    return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  SF.util.fecha = function (iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + ' ' + MESES[+p[1] - 1] + ' ' + p[0];
  };
  SF.util.dias = function (desde, hasta) {
    return Math.round((new Date(hasta) - new Date(desde)) / 86400000);
  };
  SF.util.hora12 = function (h) {
    var p = h.split(':').map(Number);
    return (p[0] % 12 || 12) + ':' + String(p[1]).padStart(2, '0') + ' ' + (p[0] >= 12 ? 'p.m.' : 'a.m.');
  };
})(window.SF);
