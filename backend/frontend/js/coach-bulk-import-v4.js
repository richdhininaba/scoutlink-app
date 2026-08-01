'use strict';

(function () {
  var TOTAL_PARTS = 13;
  var VERSION = '20260801-1';
  var base = '/frontend/js/coach-bulk-import-v4/';

  Promise.all(Array.from({ length: TOTAL_PARTS }, function (_, index) {
    var part = String(index + 1).padStart(2, '0');
    return fetch(base + 'part-' + part + '.txt?v=' + VERSION, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Bulk V4 part ' + part + ' returned ' + response.status + '.');
        return response.text();
      });
  })).then(function (parts) {
    var script = document.createElement('script');
    script.id = 'coachBulkImportV4Runtime';
    script.textContent = parts.join('');
    (document.head || document.documentElement).appendChild(script);
  }).catch(function (error) {
    console.error('[ScoutLink Bulk V4]', error);
    var host = document.querySelector('.page-content');
    if (host) {
      host.insertAdjacentHTML(
        'afterbegin',
        '<div role="alert" style="margin:0 0 14px;padding:12px;border:1px solid #f0c2c8;background:#fff2f4;color:#9d2634;font-weight:800">' +
        'Bulk import could not load. Refresh the page and try again.</div>'
      );
    }
  });
}());
