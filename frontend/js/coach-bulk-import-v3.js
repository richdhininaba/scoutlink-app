'use strict';

(function () {
  if (document.body) document.body.classList.add('coach-bulk-import-v3');

  var state = {
    initialised: false,
    selectedRow: null,
    fileName: '',
    renderTimer: null,
    observer: null,
    wrapped: false
  };

  var ATTRIBUTES = [
    'pace','agility','strength','stamina','jumping','composure',
    'shooting','passing','dribbling','defending','crossing','vision',
    'positioning','heading','tackling'
  ];

  var ATTRIBUTE_LABELS = {
    pace:'Pace',agility:'Agility',strength:'Strength',stamina:'Stamina',
    jumping:'Jumping',composure:'Composure',shooting:'Shooting',
    passing:'Passing',dribbling:'Dribbling',defending:'Defending',
    crossing:'Crossing',vision:'Vision',positioning:'Positioning',
    heading:'Heading',tackling:'Tackling'
  };

  function isBulkPage() {
    return !!document.querySelector('.bulk-import-shell, #bulkBody');
  }

  function isCoach() {
    if (!window.Auth || !window.Auth.isLoggedIn) return true;
    return window.Auth.isLoggedIn() && window.Auth.type === 'Coach';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href;
  }

  function rows() {
    var body = document.getElementById('bulkBody');
    return body ? Array.prototype.slice.call(body.querySelectorAll('tr')) : [];
  }

  function rowField(row, field) {
    return row ? row.querySelector('[data-f="' + field + '"]') : null;
  }

  function fieldValue(row, field) {
    var input = rowField(row, field);
    return input ? String(input.value || '').trim() : '';
  }

  function rowNumber(row, index) {
    var number = row && row.querySelector('.bulk-row-num');
    return number ? String(number.textContent || index + 1).trim() : String(index + 1);
  }

  function statusInfo(row) {
    var status = row && row.querySelector('[data-row-status]');
    var text = status ? String(status.textContent || '').trim() : 'Needs review';
    var ok = !!(status && status.classList.contains('is-ok'));
    var warn = !!(status && status.classList.contains('is-warn'));
    return {
      text: text || (ok ? 'Ready to submit' : 'Needs review'),
      ok: ok,
      warn: warn
    };
  }

  function coachLabel(row) {
    var select = rowField(row, 'assignedCoachId');
    if (!select) return 'Current Coach';
    var option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    return option ? String(option.textContent || '').trim() : 'Current Coach';
  }

  function teamLabel() {
    var label = document.getElementById('teamNameLabel');
    return label ? String(label.textContent || 'My team').trim() : 'My team';
  }

  function clickOriginal(id) {
    var button = document.getElementById(id);
    if (button) button.click();
  }

  function scheduleRender() {
    window.clearTimeout(state.renderTimer);
    state.renderTimer = window.setTimeout(render, 45);
  }

  function wrapFunction(name, after) {
    var original = window[name];
    if (typeof original !== 'function' || original.__cb3Wrapped) return;

    var wrapped = function () {
      var args = Array.prototype.slice.call(arguments);
      if (name === 'importRowsFromFile' && args[0] && args[0].name) {
        state.fileName = args[0].name;
        updateFileName();
      }
      var result = original.apply(this, args);
      try { after.apply(this, args); } catch (_) {}
      return result;
    };

    wrapped.__cb3Wrapped = true;
    wrapped.__cb3Original = original;
    window[name] = wrapped;
  }

  function wrapExistingFunctions() {
    if (state.wrapped) return;
    state.wrapped = true;
    wrapFunction('addRow', scheduleRender);
    wrapFunction('setStatus', scheduleRender);
    wrapFunction('renderCoachSelectors', scheduleRender);
    wrapFunction('importRowsFromFile', function () {
      scheduleRender();
      window.setTimeout(scheduleRender, 160);
      window.setTimeout(scheduleRender, 550);
    });
    wrapFunction('submitAll', function () {
      syncSubmitButtons();
      window.setTimeout(syncSubmitButtons, 100);
      window.setTimeout(syncSubmitButtons, 1000);
    });
  }

  function markLegacyHeading() {
    var shell = document.querySelector('.bulk-import-shell');
    if (!shell) return;
    Array.prototype.slice.call(shell.children).forEach(function (child) {
      var heading = child.querySelector && child.querySelector('h2');
      if (heading && /bulk player import/i.test(heading.textContent || '')) {
        child.classList.add('cb3-legacy-heading');
      }
    });
  }

  function createHero(shell, assignment) {
    if (document.getElementById('cb3Hero')) return;
    var hero = document.createElement('section');
    hero.id = 'cb3Hero';
    hero.className = 'cb3-hero';
    hero.innerHTML =
      '<div class="cb3-hero-copy">' +
        '<span class="cb3-hero-label">Coach workspace</span>' +
        '<h1>Add a squad without repetitive data entry.</h1>' +
        '<p>Download the ScoutLink template, upload a CSV or spreadsheet, review each player and correct only the rows that need attention before submitting.</p>' +
      '</div>' +
      '<div class="cb3-hero-actions">' +
        '<button class="cb3-btn" type="button" data-bulk-download>Download template</button>' +
        '<button class="cb3-btn is-primary" type="button" data-bulk-choose>Choose file</button>' +
      '</div>';
    shell.insertBefore(hero, assignment || shell.firstChild);
  }

  function createUploadPanel(shell, formError) {
    if (document.getElementById('cb3UploadPanel')) return;
    var panel = document.createElement('section');
    panel.id = 'cb3UploadPanel';
    panel.className = 'cb3-upload-panel';
    panel.innerHTML =
      '<header class="cb3-panel-head">' +
        '<div class="cb3-panel-title"><h2>Upload player file</h2><p>Use the current ScoutLink CSV or spreadsheet template.</p></div>' +
        '<span class="cb3-pill">CSV or spreadsheet</span>' +
      '</header>' +
      '<div class="cb3-panel-body">' +
        '<div class="cb3-drop-zone" id="cb3DropZone" tabindex="0" role="button" aria-label="Choose or drop a player import file">' +
          '<div class="cb3-upload-icon" aria-hidden="true">↑</div>' +
          '<h3>Drop your completed ScoutLink template here</h3>' +
          '<p>Accepted file types are CSV, XLS and XLSX. A maximum of 50 player rows can be imported at once.</p>' +
          '<div class="cb3-drop-actions">' +
            '<button class="cb3-btn is-primary" type="button" data-bulk-choose>Choose file</button>' +
            '<button class="cb3-btn" type="button" data-bulk-download>Download template</button>' +
          '</div>' +
          '<div class="cb3-file-name" id="cb3FileName" aria-live="polite"></div>' +
        '</div>' +
      '</div>';
    shell.insertBefore(panel, formError || null);
  }

  function createSummary(shell, formError) {
    if (document.getElementById('cb3SummaryGrid')) return;
    var summary = document.createElement('section');
    summary.id = 'cb3SummaryGrid';
    summary.className = 'cb3-summary-grid';
    summary.innerHTML =
      '<article class="cb3-summary-card"><small>Total rows</small><strong id="cb3TotalRows">0</strong><p>Player records currently in this import.</p></article>' +
      '<article class="cb3-summary-card"><small>Ready to submit</small><strong class="is-green" id="cb3ReadyRows">0</strong><p>Rows that pass current validation.</p></article>' +
      '<article class="cb3-summary-card"><small>Need review</small><strong class="is-orange" id="cb3ReviewRows">0</strong><p>Rows that still require a correction.</p></article>';
    shell.insertBefore(summary, formError || null);
  }

  function createPreviewPanel(shell, hiddenTableCard) {
    if (document.getElementById('cb3PreviewPanel')) return;
    var panel = document.createElement('section');
    panel.id = 'cb3PreviewPanel';
    panel.className = 'cb3-preview-panel';
    panel.innerHTML =
      '<header class="cb3-panel-head">' +
        '<div class="cb3-panel-title"><h2>Import preview</h2><p>Review the compact summary and open only the rows that need changing.</p></div>' +
        '<div class="cb3-status-pills">' +
          '<span class="cb3-pill is-green"><span id="cb3ReadyPill">0</span>&nbsp;ready</span>' +
          '<span class="cb3-pill is-orange"><span id="cb3ReviewPill">0</span>&nbsp;need review</span>' +
        '</div>' +
      '</header>' +
      '<div class="cb3-preview-scroll">' +
        '<table class="cb3-preview-table">' +
          '<thead><tr><th>Row</th><th>Player</th><th>Age group</th><th>Position</th><th>Team</th><th>Assigned Coach</th><th>Status</th><th>Action</th></tr></thead>' +
          '<tbody id="cb3PreviewBody"></tbody>' +
        '</table>' +
        '<div class="cb3-preview-empty" id="cb3PreviewEmpty">Add a row or upload the completed template to begin.</div>' +
      '</div>' +
      '<footer class="cb3-preview-footer">' +
        '<p>Every row must be ready before the existing bulk-submit process will run.</p>' +
        '<div class="cb3-preview-footer-actions">' +
          '<button class="cb3-btn" type="button" data-bulk-add>+ Add row</button>' +
          '<button class="cb3-btn" type="button" data-bulk-choose>Choose another file</button>' +
          '<button class="cb3-btn is-primary" type="button" data-bulk-submit>Submit all players</button>' +
        '</div>' +
      '</footer>';
    shell.insertBefore(panel, hiddenTableCard || null);
  }

  function createIssuesPanel(shell, hiddenTableCard) {
    if (document.getElementById('cb3IssuesPanel')) return;
    var panel = document.createElement('section');
    panel.id = 'cb3IssuesPanel';
    panel.className = 'cb3-issues-panel';
    panel.innerHTML =
      '<header class="cb3-panel-head">' +
        '<div class="cb3-panel-title"><h2>Resolve issues</h2><p>Only rows needing attention appear here.</p></div>' +
        '<button class="cb3-btn is-small" type="button" data-bulk-add>+ Add player row</button>' +
      '</header>' +
      '<div class="cb3-panel-body" id="cb3IssueBody"></div>';
    shell.insertBefore(panel, hiddenTableCard || null);
  }

  function createEditModal() {
    if (document.getElementById('cb3EditModal')) return;

    var attributeFields = ATTRIBUTES.map(function (field) {
      return '<div class="cb3-form-field">' +
        '<label for="cb3Edit-' + field + '">' + ATTRIBUTE_LABELS[field] + ' / 10</label>' +
        '<input id="cb3Edit-' + field + '" data-edit-field="' + field + '" type="number" min="1" max="10" step="0.5" placeholder="Optional">' +
      '</div>';
    }).join('');

    var modal = document.createElement('div');
    modal.id = 'cb3EditModal';
    modal.className = 'cb3-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<section class="cb3-modal-card" role="dialog" aria-modal="true" aria-labelledby="cb3EditTitle">' +
        '<header class="cb3-modal-head">' +
          '<div><h2 id="cb3EditTitle">Edit import row</h2><p id="cb3EditSubtitle">Correct the player information before submitting.</p></div>' +
          '<button class="cb3-btn is-small" type="button" data-close-bulk-edit>Close</button>' +
        '</header>' +
        '<form id="cb3EditForm">' +
          '<div class="cb3-modal-body">' +
            '<div class="cb3-modal-error" id="cb3ModalError"></div>' +
            '<section class="cb3-edit-section"><h3>Player and football details</h3>' +
              '<div class="cb3-form-grid">' +
                '<div class="cb3-form-field"><label for="cb3Edit-firstName">First name</label><input id="cb3Edit-firstName" data-edit-field="firstName" required></div>' +
                '<div class="cb3-form-field"><label for="cb3Edit-lastName">Last name</label><input id="cb3Edit-lastName" data-edit-field="lastName" required></div>' +
                '<div class="cb3-form-field"><label for="cb3Edit-ageGroup">Age group</label><select id="cb3Edit-ageGroup" data-edit-field="ageGroup"></select></div>' +
                '<div class="cb3-form-field"><label for="cb3Edit-positionGroup">Position group</label><select id="cb3Edit-positionGroup" data-edit-field="positionGroup"></select></div>' +
                '<div class="cb3-form-field"><label for="cb3Edit-specificPosition">Specific position</label><select id="cb3Edit-specificPosition" data-edit-field="specificPosition"></select></div>' +
                '<div class="cb3-form-field"><label for="cb3Edit-foot">Preferred foot</label><select id="cb3Edit-foot" data-edit-field="foot"><option>Right</option><option>Left</option><option>Both</option></select></div>' +
                '<div class="cb3-form-field"><label for="cb3Edit-heightCategory">Height profile</label><select id="cb3Edit-heightCategory" data-edit-field="heightCategory"></select></div>' +
                '<div class="cb3-form-field"><label for="cb3Edit-buildCategory">Build profile</label><select id="cb3Edit-buildCategory" data-edit-field="buildCategory"></select></div>' +
                '<div class="cb3-form-field" id="cb3EditCoachField"><label for="cb3Edit-assignedCoachId">Assigned Coach</label><select id="cb3Edit-assignedCoachId" data-edit-field="assignedCoachId"></select></div>' +
              '</div>' +
            '</section>' +
            '<section class="cb3-edit-section"><h3>Coach-rated attributes</h3><div class="cb3-form-grid">' + attributeFields + '</div></section>' +
          '</div>' +
          '<footer class="cb3-modal-actions">' +
            '<span class="cb3-edit-status" id="cb3EditStatus" aria-live="polite"></span>' +
            '<button class="cb3-btn" type="button" data-close-bulk-edit>Cancel</button>' +
            '<button class="cb3-btn is-primary" type="submit">Save row</button>' +
          '</footer>' +
        '</form>' +
      '</section>';
    document.body.appendChild(modal);
  }

  function setupStructure() {
    var shell = document.querySelector('.bulk-import-shell');
    if (!shell) return;

    markLegacyHeading();
    var assignment = document.getElementById('assignmentToolbar');
    var error = document.getElementById('formError');
    var hiddenTable = document.querySelector('.bulk-import-card');

    createHero(shell, assignment);
    createUploadPanel(shell, error);
    createSummary(shell, error);
    createPreviewPanel(shell, hiddenTable);
    createIssuesPanel(shell, hiddenTable);
    createEditModal();

    var results = document.getElementById('resultsBox');
    if (results) shell.appendChild(results);
  }

  function fillOptions(select, options, selected) {
    if (!select) return;
    select.innerHTML = options.map(function (option) {
      var value = typeof option === 'string' ? option : option.value;
      var label = typeof option === 'string' ? option : option.label;
      return '<option value="' + esc(value) + '"' +
        (String(value) === String(selected || '') ? ' selected' : '') +
        '>' + esc(label) + '</option>';
    }).join('');
  }

  function positionMap() {
    return window.POS_BY_GROUP || {
      Goalkeeper:['GK'],
      Defender:['CB','LCB','RCB','LB','RB','LWB','RWB','SW'],
      Midfielder:['CDM','CM','LCM','RCM','CAM','LM','RM','B2B'],
      Forward:['ST','LS','RS','LW','RW','CF','SS']
    };
  }

  function updateModalSpecificPositions(selected) {
    var group = document.getElementById('cb3Edit-positionGroup');
    var specific = document.getElementById('cb3Edit-specificPosition');
    if (!group || !specific) return;

    var options = [{value:'',label:'Select specific position'}].concat(
      (positionMap()[group.value] || []).map(function (position) {
        return {value:position,label:position};
      })
    );
    fillOptions(specific, options, selected || '');
  }

  function populateModal(row) {
    state.selectedRow = row;
    var index = rows().indexOf(row);
    var subtitle = document.getElementById('cb3EditSubtitle');
    if (subtitle) subtitle.textContent = 'Correct row ' + rowNumber(row, index) + ' before submitting.';

    var ageOptions = [{value:'',label:'Select age group'}].concat(
      ['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'].map(function (age) {
        return {value:age,label:age};
      })
    );
    fillOptions(document.getElementById('cb3Edit-ageGroup'), ageOptions, fieldValue(row,'ageGroup'));

    var groups = [{value:'',label:'Select position group'}].concat(
      ['Goalkeeper','Defender','Midfielder','Forward'].map(function (group) {
        return {value:group,label:group};
      })
    );
    fillOptions(document.getElementById('cb3Edit-positionGroup'), groups, fieldValue(row,'positionGroup'));
    updateModalSpecificPositions(fieldValue(row,'specificPosition'));

    var heightKeys = window.HEIGHT_OPTS || ['very_short','short','average','tall','very_tall'];
    var heightLabels = window.HEIGHT_LABELS || {};
    fillOptions(
      document.getElementById('cb3Edit-heightCategory'),
      heightKeys.map(function (key) { return {value:key,label:heightLabels[key] || key.replace(/_/g,' ')}; }),
      fieldValue(row,'heightCategory') || 'average'
    );

    var buildKeys = window.BUILD_OPTS || ['very_slight','slight','lean','athletic','stocky','powerful','very_powerful'];
    var buildLabels = window.BUILD_LABELS || {};
    fillOptions(
      document.getElementById('cb3Edit-buildCategory'),
      buildKeys.map(function (key) { return {value:key,label:buildLabels[key] || key.replace(/_/g,' ')}; }),
      fieldValue(row,'buildCategory') || 'athletic'
    );

    var coachSelect = rowField(row,'assignedCoachId');
    var modalCoach = document.getElementById('cb3Edit-assignedCoachId');
    var coachField = document.getElementById('cb3EditCoachField');
    if (coachSelect && modalCoach) {
      modalCoach.innerHTML = coachSelect.innerHTML;
      modalCoach.value = coachSelect.value;
      if (coachField) coachField.style.display = '';
    } else if (coachField) {
      coachField.style.display = 'none';
    }

    document.querySelectorAll('[data-edit-field]').forEach(function (input) {
      var field = input.getAttribute('data-edit-field');
      if (['ageGroup','positionGroup','specificPosition','heightCategory','buildCategory','assignedCoachId'].indexOf(field) >= 0) return;
      input.value = fieldValue(row,field);
    });

    var foot = document.getElementById('cb3Edit-foot');
    if (foot) foot.value = fieldValue(row,'foot') || 'Right';

    var error = document.getElementById('cb3ModalError');
    if (error) {
      error.textContent = '';
      error.classList.remove('is-visible');
    }

    var status = document.getElementById('cb3EditStatus');
    if (status) status.textContent = statusInfo(row).text;
  }

  function openEdit(row) {
    if (!row) return;
    populateModal(row);
    var modal = document.getElementById('cb3EditModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    var first = document.getElementById('cb3Edit-firstName');
    if (first) window.setTimeout(function () { first.focus(); },30);
  }

  function closeEdit() {
    var modal = document.getElementById('cb3EditModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden','true');
    state.selectedRow = null;
    document.body.style.overflow = '';
  }

  function modalValue(field) {
    var input = document.querySelector('[data-edit-field="' + field + '"]');
    return input ? String(input.value || '').trim() : '';
  }

  function validateModal() {
    var missing = [];
    if (!modalValue('firstName')) missing.push('first name');
    if (!modalValue('lastName')) missing.push('last name');
    if (!modalValue('ageGroup')) missing.push('age group');
    if (!modalValue('positionGroup')) missing.push('position group');

    var invalidAttribute = ATTRIBUTES.find(function (field) {
      var value = modalValue(field);
      if (value === '') return false;
      var number = Number(value);
      return !Number.isFinite(number) || number < 1 || number > 10;
    });
    if (invalidAttribute) missing.push(ATTRIBUTE_LABELS[invalidAttribute] + ' between 1 and 10');

    var error = document.getElementById('cb3ModalError');
    if (missing.length) {
      if (error) {
        error.textContent = 'Please add or correct: ' + missing.join(', ') + '.';
        error.classList.add('is-visible');
      }
      return false;
    }

    if (error) {
      error.textContent = '';
      error.classList.remove('is-visible');
    }
    return true;
  }

  function setRowValue(row, field, value) {
    var input = rowField(row,field);
    if (input) input.value = value == null ? '' : String(value);
  }

  function saveEdit(event) {
    event.preventDefault();
    var row = state.selectedRow;
    if (!row || !validateModal()) return;

    setRowValue(row,'firstName',modalValue('firstName'));
    setRowValue(row,'lastName',modalValue('lastName'));
    setRowValue(row,'ageGroup',modalValue('ageGroup'));
    setRowValue(row,'positionGroup',modalValue('positionGroup'));

    var positionSelect = rowField(row,'positionGroup');
    if (positionSelect) positionSelect.dispatchEvent(new Event('change',{bubbles:true}));

    setRowValue(row,'specificPosition',modalValue('specificPosition'));
    setRowValue(row,'foot',modalValue('foot'));
    setRowValue(row,'heightCategory',modalValue('heightCategory'));
    setRowValue(row,'buildCategory',modalValue('buildCategory'));
    setRowValue(row,'assignedCoachId',modalValue('assignedCoachId'));

    ATTRIBUTES.forEach(function (field) {
      setRowValue(row,field,modalValue(field));
    });

    if (typeof window.validateRow === 'function') window.validateRow(row);
    scheduleRender();
    window.setTimeout(closeEdit,160);
  }

  function removeRow(row) {
    if (!row) return;
    var name = (fieldValue(row,'firstName') + ' ' + fieldValue(row,'lastName')).trim() || 'this row';
    if (!window.confirm('Remove ' + name + ' from this import?')) return;
    var remove = row.querySelector('[data-remove]');
    if (remove) remove.click();
    else row.remove();
    scheduleRender();
  }

  function previewRow(row,index) {
    var status = statusInfo(row);
    var name = (fieldValue(row,'firstName') + ' ' + fieldValue(row,'lastName')).trim() || 'Unnamed player';
    var age = fieldValue(row,'ageGroup') || 'Missing';
    var position = fieldValue(row,'specificPosition') || fieldValue(row,'positionGroup') || 'Missing';
    var statusClass = status.ok ? 'is-green' : status.warn ? 'is-orange' : 'is-red';
    var actionLabel = status.ok ? 'Edit row' : 'Fix row';

    return '<tr>' +
      '<td data-label="Row">' + esc(rowNumber(row,index)) + '</td>' +
      '<td data-label="Player"><b>' + esc(name) + '</b><small>' + esc(fieldValue(row,'foot') || 'Foot TBC') + ' foot</small></td>' +
      '<td data-label="Age group">' + esc(age) + '</td>' +
      '<td data-label="Position">' + esc(position) + '</td>' +
      '<td data-label="Team">' + esc(teamLabel()) + '</td>' +
      '<td data-label="Assigned Coach">' + esc(coachLabel(row)) + '</td>' +
      '<td data-label="Status"><span class="cb3-pill ' + statusClass + '">' + esc(status.ok ? 'Ready' : 'Review') + '</span><small>' + esc(status.text) + '</small></td>' +
      '<td data-label="Action"><div class="cb3-row-actions">' +
        '<button class="cb3-btn is-small ' + (status.ok ? '' : 'is-primary') + '" type="button" data-edit-row="' + index + '">' + actionLabel + '</button>' +
        '<button class="cb3-btn is-small is-danger" type="button" data-remove-row="' + index + '">Remove</button>' +
      '</div></td>' +
    '</tr>';
  }

  function issueCard(row,index) {
    var status = statusInfo(row);
    var name = (fieldValue(row,'firstName') + ' ' + fieldValue(row,'lastName')).trim();
    return '<article class="cb3-issue">' +
      '<div><b>Row ' + esc(rowNumber(row,index)) + (name ? ' · ' + esc(name) : '') + '</b><p>' + esc(status.text) + '</p></div>' +
      '<button class="cb3-btn is-primary is-small" type="button" data-edit-row="' + index + '">Fix row</button>' +
    '</article>';
  }

  function render() {
    if (!state.initialised) return;

    var allRows = rows();
    var readyRows = allRows.filter(function (row) { return statusInfo(row).ok; });
    var reviewRows = allRows.filter(function (row) { return !statusInfo(row).ok; });

    [
      ['cb3TotalRows',allRows.length],
      ['cb3ReadyRows',readyRows.length],
      ['cb3ReviewRows',reviewRows.length],
      ['cb3ReadyPill',readyRows.length],
      ['cb3ReviewPill',reviewRows.length]
    ].forEach(function (pair) {
      var element = document.getElementById(pair[0]);
      if (element) element.textContent = pair[1];
    });

    var previewBody = document.getElementById('cb3PreviewBody');
    var empty = document.getElementById('cb3PreviewEmpty');
    if (previewBody) previewBody.innerHTML = allRows.map(previewRow).join('');
    if (empty) empty.style.display = allRows.length ? 'none' : 'grid';

    var issueBody = document.getElementById('cb3IssueBody');
    if (issueBody) {
      if (reviewRows.length) {
        issueBody.innerHTML = '<div class="cb3-issue-list">' +
          allRows.map(function (row,index) {
            return statusInfo(row).ok ? '' : issueCard(row,index);
          }).join('') +
        '</div>';
      } else if (allRows.length) {
        issueBody.innerHTML =
          '<div class="cb3-all-ready"><span class="cb3-pill is-green">Ready</span><div><strong>Every row passes the current validation.</strong>' +
          '<p>Review the compact preview once more, then submit all players.</p></div></div>';
      } else {
        issueBody.innerHTML = '<div class="cb3-preview-empty">No rows have been added yet.</div>';
      }
    }

    bindDynamicActions();
    syncSubmitButtons();
    updateFileName();
  }

  function bindDynamicActions() {
    document.querySelectorAll('[data-edit-row]').forEach(function (button) {
      if (button.dataset.cb3Bound) return;
      button.dataset.cb3Bound = '1';
      button.addEventListener('click',function () {
        openEdit(rows()[Number(button.getAttribute('data-edit-row'))]);
      });
    });

    document.querySelectorAll('[data-remove-row]').forEach(function (button) {
      if (button.dataset.cb3Bound) return;
      button.dataset.cb3Bound = '1';
      button.addEventListener('click',function () {
        removeRow(rows()[Number(button.getAttribute('data-remove-row'))]);
      });
    });
  }

  function updateFileName() {
    var label = document.getElementById('cb3FileName');
    if (label) label.textContent = state.fileName ? 'Selected file: ' + state.fileName : '';
  }

  function syncSubmitButtons() {
    var original = document.getElementById('submitAllBtn');
    document.querySelectorAll('[data-bulk-submit]').forEach(function (button) {
      if (!original) return;
      button.disabled = !!original.disabled;
      button.textContent = original.disabled ? (original.textContent || 'Submitting…') : 'Submit all players';
    });
  }

  function bindStaticActions() {
    document.querySelectorAll('[data-bulk-download]').forEach(function (button) {
      if (button.dataset.cb3Bound) return;
      button.dataset.cb3Bound = '1';
      button.addEventListener('click',function () { clickOriginal('downloadTemplateBtn'); });
    });

    document.querySelectorAll('[data-bulk-choose]').forEach(function (button) {
      if (button.dataset.cb3Bound) return;
      button.dataset.cb3Bound = '1';
      button.addEventListener('click',function () { clickOriginal('importFileBtn'); });
    });

    document.querySelectorAll('[data-bulk-add]').forEach(function (button) {
      if (button.dataset.cb3Bound) return;
      button.dataset.cb3Bound = '1';
      button.addEventListener('click',function () {
        clickOriginal('addRowBtn');
        window.setTimeout(function () {
          var allRows = rows();
          if (allRows.length) openEdit(allRows[allRows.length - 1]);
        },50);
      });
    });

    document.querySelectorAll('[data-bulk-submit]').forEach(function (button) {
      if (button.dataset.cb3Bound) return;
      button.dataset.cb3Bound = '1';
      button.addEventListener('click',function () {
        clickOriginal('submitAllBtn');
        syncSubmitButtons();
      });
    });

    document.querySelectorAll('[data-close-bulk-edit]').forEach(function (button) {
      if (button.dataset.cb3Bound) return;
      button.dataset.cb3Bound = '1';
      button.addEventListener('click',closeEdit);
    });

    var form = document.getElementById('cb3EditForm');
    if (form && !form.dataset.cb3Bound) {
      form.dataset.cb3Bound = '1';
      form.addEventListener('submit',saveEdit);
    }

    var group = document.getElementById('cb3Edit-positionGroup');
    if (group && !group.dataset.cb3Bound) {
      group.dataset.cb3Bound = '1';
      group.addEventListener('change',function () { updateModalSpecificPositions(''); });
    }

    var modal = document.getElementById('cb3EditModal');
    if (modal && !modal.dataset.cb3Bound) {
      modal.dataset.cb3Bound = '1';
      modal.addEventListener('click',function (event) {
        if (event.target === modal) closeEdit();
      });
    }

    var drop = document.getElementById('cb3DropZone');
    if (drop && !drop.dataset.cb3Bound) {
      drop.dataset.cb3Bound = '1';

      ['dragenter','dragover'].forEach(function (name) {
        drop.addEventListener(name,function (event) {
          event.preventDefault();
          drop.classList.add('is-dragging');
        });
      });

      ['dragleave','drop'].forEach(function (name) {
        drop.addEventListener(name,function (event) {
          event.preventDefault();
          drop.classList.remove('is-dragging');
        });
      });

      drop.addEventListener('drop',function (event) {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file && typeof window.importRowsFromFile === 'function') window.importRowsFromFile(file);
      });

      drop.addEventListener('keydown',function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          clickOriginal('importFileBtn');
        }
      });
    }

    var defaultCoach = document.getElementById('defaultCoachSelect');
    if (defaultCoach && !defaultCoach.dataset.cb3Bound) {
      defaultCoach.dataset.cb3Bound = '1';
      defaultCoach.addEventListener('change',scheduleRender);
    }

    if (!document.body.dataset.cb3EscapeBound) {
      document.body.dataset.cb3EscapeBound = '1';
      document.addEventListener('keydown',function (event) {
        if (event.key === 'Escape') closeEdit();
      });
    }
  }

  function mobileNavMarkup() {
    return [
      '<a href="' + esc(route('coach-dashboard.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/></svg><span>Home</span></a>',
      '<a class="active" href="' + esc(route('coach-my-players.html')) + '" aria-current="page"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg><span>Players</span></a>',
      '<a href="' + esc(route('match-facts.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7Z"/><path d="m5.5 10.5 3.5-1.3M15 9.2l3.5 1.3M10.1 12.7 8 16m5.9-3.3L16 16"/></svg><span>Match</span></a>',
      '<a href="' + esc(route('coach-chat.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l2.5-2H17a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3"/><path d="M8 9h8M8 13h5"/></svg><span>Chat</span></a>',
      '<a href="' + esc(route('coach-settings.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 4.3a1.7 1.7 0 0 1 3.4 0 1.7 1.7 0 0 0 2.6 1.1 1.7 1.7 0 0 1 2.4 2.4 1.7 1.7 0 0 0 1 2.5 1.7 1.7 0 0 1 0 3.4 1.7 1.7 0 0 0-1 2.6 1.7 1.7 0 0 1-2.4 2.4 1.7 1.7 0 0 0-2.6 1 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 0-2.6-1 1.7 1.7 0 0 1-2.4-2.4 1.7 1.7 0 0 0-1-2.6 1.7 1.7 0 0 1 0-3.4 1.7 1.7 0 0 0 1-2.5 1.7 1.7 0 0 1 2.4-2.4 1.7 1.7 0 0 0 2.6-1.1Z"/><circle cx="12" cy="12" r="3"/></svg><span>More</span></a>'
    ].join('');
  }

  function refreshCoachChrome() {
    document.body.classList.add('coach-bulk-import-v3');

    var title = document.querySelector('.topbar-title');
    if (title) title.textContent = 'Bulk import';

    var mobileTitle = document.querySelector('.coach-v2-mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'Bulk import';

    document.querySelectorAll('.coach-v2-hero,.coach-v2-bulk-toolbar').forEach(function (element) {
      element.setAttribute('aria-hidden','true');
    });

    var bottom = document.querySelector('.coach-v2-bottom-nav');
    if (bottom && !bottom.dataset.cb3Nav) {
      bottom.dataset.cb3Nav = '1';
      bottom.setAttribute('aria-label','Coach mobile navigation');
      bottom.innerHTML = mobileNavMarkup();
    }
  }

  function observeRows() {
    var body = document.getElementById('bulkBody');
    if (!body || state.observer) return;
    state.observer = new MutationObserver(scheduleRender);
    state.observer.observe(body,{childList:true,subtree:true});
  }

  function observeSubmitButton() {
    var original = document.getElementById('submitAllBtn');
    if (!original || original.dataset.cb3Observed) return;
    original.dataset.cb3Observed = '1';
    var observer = new MutationObserver(syncSubmitButtons);
    observer.observe(original,{attributes:true,childList:true,characterData:true,subtree:true});
  }

  function init() {
    if (state.initialised || !isBulkPage() || !isCoach()) return;
    state.initialised = true;

    document.body.classList.add('coach-bulk-import-v3');
    wrapExistingFunctions();
    setupStructure();
    bindStaticActions();
    observeRows();
    observeSubmitButton();
    refreshCoachChrome();
    render();

    window.setTimeout(function () {
      refreshCoachChrome();
      bindStaticActions();
      render();
    },350);

    window.setTimeout(function () {
      refreshCoachChrome();
      bindStaticActions();
      render();
    },1300);
  }

  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('resize',refreshCoachChrome);
})();
