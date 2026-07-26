const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPMqYFRH5iIo274Q_S80dwYB1KxinEXb2a22zloUrGNcy34K0rpZOSQDSZqTRlTfWr/exec';

async function loadSchedule() {
  const loading = document.getElementById('loading');
  const table = document.getElementById('schedule');
  const errorBanner = document.getElementById('error-banner');

  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) throw new Error('Failed to load schedule');
    const rows = await res.json();
    renderTable(rows);
    setScheduleYear(rows);
    loading.hidden = true;
    table.hidden = false;
  } catch (err) {
    loading.hidden = true;
    errorBanner.textContent = 'Unable to load the schedule. Please try again later.';
    errorBanner.hidden = false;
  }
}

function setScheduleYear(rows) {
  const yearMatch = rows.length > 0 ? rows[0].date.match(/\d{4}/) : null;
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
  document.getElementById('schedule-year').textContent = year;
  document.title = 'Shiva Shakti Mandir — ' + year + ' Sponsorship Schedule';
}

function renderTable(rows) {
  const tbody = document.getElementById('schedule-body');
  tbody.innerHTML = '';
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.className = 'row-' + row.status;
    tr.dataset.index = i;

    const tdDate = document.createElement('td');
    const dateSpan = document.createElement('span');
    dateSpan.className = 'date-text';
    dateSpan.textContent = row.date;
    tdDate.appendChild(dateSpan);
    if (row.time) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'time-text';
      timeSpan.textContent = row.time;
      tdDate.appendChild(timeSpan);
    }

    const tdEvent = document.createElement('td');
    tdEvent.textContent = row.event;

    const tdSponsor = document.createElement('td');
    tdSponsor.appendChild(buildSponsorCell(row, i));

    tr.appendChild(tdDate);
    tr.appendChild(tdEvent);
    tr.appendChild(tdSponsor);
    tbody.appendChild(tr);
  });
}

function buildSponsorCell(row, i) {
  const frag = document.createDocumentFragment();

  if (row.status === 'taken') {
    const label = document.createElement('span');
    label.className = 'sponsored-label';
    label.textContent = 'Sponsored';
    frag.appendChild(label);
  } else if (row.status === 'info-only') {
    const label = document.createElement('span');
    label.className = 'info-only-label';
    label.textContent = 'No sponsorship needed';
    frag.appendChild(label);
  } else if (row.status === 'open') {
    const btn = document.createElement('button');
    btn.className = 'btn-sponsor';
    btn.textContent = 'Sponsor This Date';
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => openForm(btn, row, i));
    frag.appendChild(btn);
    frag.appendChild(buildForm(row, i, btn));
  }

  return frag;
}

function buildForm(row, i, triggerBtn) {
  const nameId = 'name-' + i;
  const contactId = 'contact-' + i;
  const commentsId = 'comments-' + i;
  const nameErrorId = 'name-error-' + i;
  const contactErrorId = 'contact-error-' + i;
  const submitErrorId = 'submit-error-' + i;

  const wrapper = document.createElement('div');
  wrapper.className = 'signup-form';
  wrapper.hidden = true;

  wrapper.innerHTML = `
    <form novalidate>
      <div class="form-field">
        <label for="${nameId}">Name <span class="required" aria-hidden="true">*</span></label>
        <input id="${nameId}" type="text" autocomplete="name" aria-required="true" aria-describedby="${nameErrorId}">
        <span id="${nameErrorId}" class="field-error" aria-live="polite"></span>
      </div>
      <div class="form-field">
        <label for="${contactId}">Phone or Email <span class="required" aria-hidden="true">*</span></label>
        <input id="${contactId}" type="text" autocomplete="email" aria-required="true" aria-describedby="${contactErrorId}">
        <span id="${contactErrorId}" class="field-error" aria-live="polite"></span>
      </div>
      <div class="form-field">
        <label for="${commentsId}">Comments <span class="optional">(optional)</span></label>
        <input id="${commentsId}" type="text">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-claim">Claim This Date</button>
        <button type="button" class="btn-cancel">Cancel</button>
        <span id="${submitErrorId}" class="submit-error" aria-live="polite"></span>
      </div>
    </form>
  `;

  const form = wrapper.querySelector('form');
  const nameInput = wrapper.querySelector('#' + nameId);
  const contactInput = wrapper.querySelector('#' + contactId);
  const nameError = wrapper.querySelector('#' + nameErrorId);
  const contactError = wrapper.querySelector('#' + contactErrorId);
  const submitError = wrapper.querySelector('#' + submitErrorId);
  const claimBtn = wrapper.querySelector('.btn-claim');
  const cancelBtn = wrapper.querySelector('.btn-cancel');

  cancelBtn.addEventListener('click', () => closeForm(wrapper, triggerBtn));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;

    nameError.textContent = '';
    contactError.textContent = '';
    submitError.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    contactInput.removeAttribute('aria-invalid');

    if (!nameInput.value.trim()) {
      nameError.textContent = 'Name is required.';
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      valid = false;
    }

    if (!contactInput.value.trim()) {
      contactError.textContent = 'Phone or email is required.';
      contactInput.setAttribute('aria-invalid', 'true');
      if (valid) contactInput.focus();
      valid = false;
    }

    if (!valid) return;

    claimBtn.disabled = true;
    claimBtn.textContent = 'Submitting…';

    try {
      const payload = {
        date: row.date,
        name: nameInput.value.trim(),
        contact: contactInput.value.trim(),
        comments: wrapper.querySelector('#' + commentsId).value.trim(),
      };

      // Apps Script POST redirects cross-origin; response body is unreadable.
      // Use no-cors and update the UI optimistically on network success.
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      });

      closeForm(wrapper, triggerBtn);
      refreshRow(row.date, { sponsor: payload.name, comments: payload.comments });
    } catch (err) {
      submitError.textContent = 'Something went wrong. Please try again.';
      claimBtn.disabled = false;
      claimBtn.textContent = 'Claim This Date';
    }
  });

  return wrapper;
}

function openForm(btn, row, i) {
  const td = btn.closest('td');
  const form = td.querySelector('.signup-form');
  form.hidden = false;
  btn.hidden = true;
  btn.setAttribute('aria-expanded', 'true');
  td.querySelector('input').focus();
}

function closeForm(wrapper, triggerBtn) {
  wrapper.hidden = true;
  triggerBtn.hidden = false;
  triggerBtn.setAttribute('aria-expanded', 'false');
  wrapper.querySelector('form').reset();
  wrapper.querySelectorAll('.field-error, .submit-error').forEach(el => el.textContent = '');
  wrapper.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
}

function refreshRow(date, sponsorData) {
  const tbody = document.getElementById('schedule-body');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(tr => {
    const dateCell = tr.querySelector('td:first-child');
    if (!dateCell || dateCell.textContent !== date) return;

    if (sponsorData) {
      tr.className = 'row-taken';
      const sponsorCell = tr.querySelector('td:last-child');
      sponsorCell.innerHTML = '';
      const label = document.createElement('span');
      label.className = 'sponsored-label';
      label.textContent = 'Sponsored';
      sponsorCell.appendChild(label);
    } else {
      loadSchedule();
    }
  });
}

if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.startsWith('{{')) {
  loadSchedule();
} else {
  const previewRows = [
    { date: 'Sunday, January 4, 2026',    event: 'Sunday Morning Service', sponsor: 'Anisha & Kelia', comments: 'Birthday',  status: 'taken' },
    { date: 'Sunday, February 1, 2026',   event: 'Sunday Morning Service', sponsor: '',               comments: '',          status: 'open'  },
    { date: 'Wednesday, January 14, 2026',event: 'Makar Sankranti',        sponsor: '',               comments: '',          status: 'info-only' },
  ];
  renderTable(previewRows);
  document.getElementById('loading').hidden = true;
  document.getElementById('schedule').hidden = false;
}
