/**
 * Plaza Gráfica Dominicana, registro de invitados.
 * Contrato v4: una empresa y una cantidad variable de invitados por solicitud.
 */

var NOTIFY_EMAILS = ['bariluis75@gmail.com', 'Bvasquez@plazagraficadr.com'];
var SEND_GUEST_EMAIL = true;
var SENDER_NAME = 'Plaza Gráfica Dominicana';
var REPLY_TO = 'ventas@plazagraficadr.com';
var FROM_ALIAS = '';

var SHEET_NAME = 'Registros';
var MIN_ELAPSED_MS = 2500;

var HEADERS = [
  'Timestamp',
  'Empresa',
  'Teléfono Empresa',
  'Invitado',
  'Cargo',
  'Teléfono Directo',
  'Email',
  'Modalidad de Asistencia',
  'Horario de Cita',
  'Source',
  'ID de Envío',
  'Invitado #'
];

var VISIT_LABELS = {
  confirmar: 'Confirmar asistencia',
  contacto: 'Demostración personalizada con cita'
};

var APPOINTMENT_SLOTS = {
  '09:00-10:00': '9:00 a. m. a 10:00 a. m.',
  '10:00-11:00': '10:00 a. m. a 11:00 a. m.',
  '11:00-12:00': '11:00 a. m. a 12:00 p. m.',
  '12:00-13:00': '12:00 p. m. a 1:00 p. m.',
  '13:00-14:00': '1:00 p. m. a 2:00 p. m.',
  '14:00-15:00': '2:00 p. m. a 3:00 p. m.',
  '15:00-16:00': '3:00 p. m. a 4:00 p. m.',
  '16:00-17:00': '4:00 p. m. a 5:00 p. m.',
  '17:00-18:00': '5:00 p. m. a 6:00 p. m.',
  '18:00-19:00': '6:00 p. m. a 7:00 p. m.'
};

var EVENTO = {
  nombre: 'Demostración de Equipos de Impresión Digital',
  fecha: 'Miércoles 09 de septiembre de 2026',
  lugar: 'Hotel Santiago, Curio Collection by Hilton',
  salon: 'Salón Grand Samán',
  ciudad: 'Santiago de los Caballeros, República Dominicana',
  exhibicion: '9:00 a. m. a 7:00 p. m.',
  coctel: '7:00 p. m. a 8:00 p. m.',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Hotel%20Santiago%20Curio%20Collection%20by%20Hilton%2C%20Santiago%20de%20los%20Caballeros',
  telefono: '809-221-4242 ext. 224',
  whatsapp: '809-224-2427',
  correo: 'ventas@plazagraficadr.com'
};

function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'Registro Plaza Gráfica 2026',
    schemaVersion: 4,
    time: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_(failure_('empty_body', 'No recibimos datos.'));
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse_(failure_('bad_json', 'No pudimos leer los datos.'));
    }

    if (data.website) {
      return jsonResponse_({ ok: true, schemaVersion: 4, skipped: true, saved: 0 });
    }

    var elapsed = Number(data.elapsedMs || 0);
    if (elapsed > 0 && elapsed < MIN_ELAPSED_MS) {
      return jsonResponse_({ ok: true, schemaVersion: 4, skipped: true, saved: 0 });
    }

    var parsed = parseRegistration_(data);
    if (!parsed.ok) return jsonResponse_(parsed);

    var registration = parsed.registration;
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      var sheet = getSheet_();
      if (isDuplicateSubmission_(sheet, registration.submissionId)) {
        return jsonResponse_({
          ok: true,
          schemaVersion: 4,
          duplicate: true,
          saved: 0,
          submissionId: registration.submissionId
        });
      }

      var timestamp = new Date();
      var rows = registration.attendees.map(function (attendee, index) {
        return [
          timestamp,
          sheetSafe_(registration.companyName),
          sheetSafe_(registration.companyPhone),
          sheetSafe_(attendee.name),
          sheetSafe_(attendee.jobTitle),
          sheetSafe_(attendee.phone),
          sheetSafe_(attendee.email),
          VISIT_LABELS[attendee.visitType],
          sheetSafe_(preferredTimeLabel_(attendee)),
          sheetSafe_(registration.source),
          registration.submissionId,
          index + 1
        ];
      });

      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }

    // El registro queda guardado incluso si algún correo alcanza una cuota o falla.
    enviarAvisoEquipo_(registration);
    registration.attendees.forEach(function (attendee) {
      enviarConfirmacionInvitado_(registration.companyName, attendee);
    });

    return jsonResponse_({
      ok: true,
      schemaVersion: 4,
      saved: registration.attendees.length,
      submissionId: registration.submissionId
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_(
      failure_('server_error', 'No pudimos confirmar su registro en este momento.')
    );
  }
}

function parseRegistration_(data) {
  var schemaVersion = Number(data.schemaVersion || 3);
  var companyName = clean_(data.companyName, 120);
  var companyPhone = clean_(data.companyPhone, 40);
  var submissionId = clean_(data.submissionId, 100) || 'legacy-' + Utilities.getUuid();
  var source = clean_(data.source, 40) || 'directo';
  var rawAttendees = Array.isArray(data.attendees)
    ? data.attendees
    : [
        {
          name: data.attendeeName,
          jobTitle: data.attendeeJobTitle || data.attendeeRole,
          phone: data.attendeePhone,
          email: data.attendeeEmail,
          visitType: data.visitType,
          preferredTime: data.preferredTime
        }
      ];

  if (!companyName || !companyPhone) {
    return failure_('missing_company', 'Complete los datos de la empresa.');
  }
  if (!isPhone_(companyPhone)) {
    return failure_('bad_company_phone', 'Revise el teléfono de la empresa.');
  }
  if (!/^[a-zA-Z0-9._:-]{8,100}$/.test(submissionId)) {
    return failure_('bad_submission_id', 'El identificador del registro no es válido.');
  }
  if (rawAttendees.length < 1) {
    return failure_('bad_attendee_count', 'Registre al menos un invitado.');
  }

  var attendees = [];
  for (var i = 0; i < rawAttendees.length; i++) {
    var raw = rawAttendees[i] || {};
    var attendee = {
      name: clean_(raw.name || raw.attendeeName, 120),
      jobTitle: clean_(raw.jobTitle || raw.attendeeJobTitle || raw.attendeeRole, 120),
      phone: clean_(raw.phone || raw.attendeePhone, 40),
      email: clean_(raw.email || raw.attendeeEmail, 160).toLowerCase(),
      visitType: clean_(raw.visitType, 20),
      preferredTime: clean_(raw.preferredTime, 20)
    };

    if (
      !attendee.name ||
      !attendee.jobTitle ||
      !attendee.phone ||
      !attendee.email ||
      !attendee.visitType
    ) {
      return failure_(
        'missing_attendee_fields',
        'Complete nombre, cargo, teléfono, correo y preferencia del invitado ' + (i + 1) + '.'
      );
    }
    if (!isPhone_(attendee.phone)) {
      return failure_('bad_attendee_phone', 'Revise el teléfono del invitado ' + (i + 1) + '.');
    }
    if (!isEmail_(attendee.email)) {
      return failure_('bad_attendee_email', 'Revise el correo del invitado ' + (i + 1) + '.');
    }
    if (!VISIT_LABELS[attendee.visitType]) {
      return failure_(
        'bad_visit_type',
        'Seleccione una preferencia válida para el invitado ' + (i + 1) + '.'
      );
    }
    if (attendee.visitType === 'contacto') {
      if (schemaVersion >= 4 && !APPOINTMENT_SLOTS[attendee.preferredTime]) {
        return failure_(
          'bad_appointment_time',
          'Seleccione una hora válida para el invitado ' + (i + 1) + '.'
        );
      }
      if (schemaVersion < 4 && !APPOINTMENT_SLOTS[attendee.preferredTime]) {
        attendee.preferredTime = 'legacy-pending';
      }
    } else {
      attendee.preferredTime = '';
    }
    attendees.push(attendee);
  }

  return {
    ok: true,
    registration: {
      submissionId: submissionId,
      companyName: companyName,
      companyPhone: companyPhone,
      source: source,
      attendees: attendees
    }
  };
}

function failure_(error, message) {
  return { ok: false, error: error, message: message };
}

function preferredTimeLabel_(attendee) {
  if (attendee.visitType !== 'contacto') return '';
  return APPOINTMENT_SLOTS[attendee.preferredTime] || 'Por coordinar';
}

function appointmentExpectation_(attendee) {
  return 'Le esperamos en el evento de ' + preferredTimeLabel_(attendee) +
    ' para su demostración personalizada.';
}

function enviarAvisoEquipo_(registration) {
  if (!NOTIFY_EMAILS.length) return;
  try {
    var contactCount = registration.attendees.filter(function (attendee) {
      return attendee.visitType === 'contacto';
    }).length;
    var lines = registration.attendees.map(function (attendee, index) {
      return (
        '\nInvitado ' + (index + 1) + ': ' + attendee.name +
        '\nCargo: ' + attendee.jobTitle +
        '\nTeléfono: ' + attendee.phone +
        '\nCorreo: ' + attendee.email +
        '\nModalidad: ' + VISIT_LABELS[attendee.visitType] +
        (attendee.visitType === 'contacto'
          ? '\nHorario de cita: ' + preferredTimeLabel_(attendee)
          : '')
      );
    });

    MailApp.sendEmail(
      opcionesCorreo_({
        to: NOTIFY_EMAILS.join(','),
        subject:
          (contactCount ? '[CITA] ' : '[Registro] ') +
          registration.companyName +
          ' (' + registration.attendees.length + ')',
        body:
          'Nuevo registro para ' + EVENTO.nombre + '.\n\n' +
          'Empresa: ' + registration.companyName + '\n' +
          'Teléfono: ' + registration.companyPhone + '\n' +
          'Origen: ' + registration.source + '\n' +
          'ID: ' + registration.submissionId + '\n' +
          lines.join('\n') + '\n\n' +
          (contactCount
            ? 'ACCIÓN: atender ' + contactCount + ' cita(s) en los horarios indicados.\n\n'
            : '') +
          'Hoja de registros: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      })
    );
  } catch (error) {
    console.error('Aviso al equipo no enviado: ' + error);
  }
}

function enviarConfirmacionInvitado_(companyName, attendee) {
  if (!SEND_GUEST_EMAIL || !attendee.email) return;
  try {
    var visitText =
      attendee.visitType === 'contacto'
        ? appointmentExpectation_(attendee) + '\n\n'
        : 'Puede visitarnos durante el horario de exhibición, sin cita previa.\n\n';
    var body =
      attendee.name + ', su asistencia está confirmada.\n\n' +
      'Gracias por registrarse como ' + attendee.jobTitle + ' en representación de ' + companyName + '.\n\n' +
      EVENTO.fecha + '\n' + EVENTO.lugar + '\n' + EVENTO.salon + ' · ' + EVENTO.ciudad + '\n\n' +
      'Exhibición: ' + EVENTO.exhibicion + '\n' + 'Cóctel: ' + EVENTO.coctel + '\n\n' +
      visitText + 'Cómo llegar: ' + EVENTO.mapa + '\n\n' + SENDER_NAME;

    var safeName = htmlEscape_(attendee.name);
    var safeCompany = htmlEscape_(companyName);
    var safeJobTitle = htmlEscape_(attendee.jobTitle);
    var visitHtml =
      '<p style="margin:0 0 20px;padding:12px 14px;background:#eaf6fc;border:1px solid #8ecde8;color:#14110d">' +
      htmlEscape_(
        attendee.visitType === 'contacto'
          ? appointmentExpectation_(attendee)
          : 'Puede visitarnos durante el horario de exhibición, sin cita previa.'
      ) + '</p>';
    var appointmentRow =
      attendee.visitType === 'contacto'
        ? filaHtml_('Horario de cita', htmlEscape_(preferredTimeLabel_(attendee)))
        : '';
    var html =
      '<div style="font-family:Helvetica,Arial,sans-serif;color:#14110d;line-height:1.6">' +
      '<div style="height:6px;background:#0096d6"></div>' +
      '<div style="padding:28px 24px;max-width:520px">' +
      '<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#6b655c;margin:0 0 12px">' + SENDER_NAME + '</p>' +
      '<h1 style="font-size:26px;line-height:1.15;margin:0 0 14px">Su asistencia está confirmada</h1>' +
      '<p style="margin:0 0 20px;color:#4a453d">' + safeName +
      ', gracias por registrarse en representación de ' + safeCompany + '.</p>' +
      '<table style="border-collapse:collapse;width:100%;margin-bottom:20px">' +
      filaHtml_('Cargo', safeJobTitle) +
      filaHtml_('Cuándo', htmlEscape_(EVENTO.fecha)) +
      filaHtml_('Dónde', htmlEscape_(EVENTO.lugar) + '<br>' + htmlEscape_(EVENTO.salon)) +
      filaHtml_('Modalidad', htmlEscape_(VISIT_LABELS[attendee.visitType])) +
      appointmentRow +
      filaHtml_('Exhibición', htmlEscape_(EVENTO.exhibicion)) +
      filaHtml_('Cóctel', htmlEscape_(EVENTO.coctel)) + '</table>' +
      visitHtml +
      '<p style="margin:0"><a href="' + EVENTO.mapa + '" style="display:inline-block;padding:12px 22px;background:#14110d;color:#f7f4ee;border-radius:999px;text-decoration:none;font-weight:600">Cómo llegar</a></p>' +
      '<p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #eceae4;font-size:13px;color:#6b655c">' +
      'Contacto: ' + EVENTO.telefono + ' · WhatsApp ' + EVENTO.whatsapp + '<br>' +
      '<a href="mailto:' + EVENTO.correo + '" style="color:#14110d">' + EVENTO.correo + '</a></p>' +
      '</div></div>';

    MailApp.sendEmail(
      opcionesCorreo_({
        to: attendee.email,
        subject: 'Su asistencia está confirmada · ' + EVENTO.nombre,
        body: body,
        htmlBody: html
      })
    );
  } catch (error) {
    console.error('Confirmación no enviada a ' + attendee.email + ': ' + error);
  }
}

function opcionesCorreo_(options) {
  options.name = SENDER_NAME;
  if (!options.replyTo && REPLY_TO) options.replyTo = REPLY_TO;
  if (FROM_ALIAS) {
    try {
      var aliases = GmailApp.getAliases();
      if (aliases.indexOf(FROM_ALIAS) !== -1) options.from = FROM_ALIAS;
    } catch (error) {
      console.warn('No se pudieron leer los alias: ' + error);
    }
  }
  return options;
}

function filaHtml_(label, value) {
  return (
    '<tr><td style="padding:8px 0;border-bottom:1px solid #eceae4;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b655c;vertical-align:top;width:110px">' +
    label + '</td><td style="padding:8px 0;border-bottom:1px solid #eceae4;font-weight:600">' +
    value + '</td></tr>'
  );
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function clean_(value, maxLength) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function sheetSafe_(value) {
  var text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function htmlEscape_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value);
}

function isPhone_(value) {
  var digits = String(value).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function getSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  ensureSheetSchema_(spreadsheet, sheet);
  return sheet;
}

function ensureSheetSchema_(spreadsheet, sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    formatSheet_(sheet);
    return;
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  if (currentHeaders.slice(0, HEADERS.length).join('|') === HEADERS.join('|')) {
    formatSheet_(sheet);
    return;
  }

  var indexes = {
    timestamp: findHeader_(currentHeaders, ['timestamp', 'fecha', 'fecha y hora']),
    company: findHeader_(currentHeaders, ['empresa']),
    companyPhone: findHeader_(currentHeaders, ['telefono empresa', 'telefono de empresa']),
    attendee: findHeader_(currentHeaders, ['invitado', 'representante', 'nombre invitado']),
    jobTitle: findHeader_(currentHeaders, ['cargo', 'puesto', 'cargo en la empresa']),
    phone: findHeader_(currentHeaders, [
      'telefono directo',
      'telefono representante',
      'telefono invitado'
    ]),
    email: findHeader_(currentHeaders, ['email', 'correo', 'correo electronico']),
    visit: findHeader_(currentHeaders, [
      'modalidad de asistencia',
      'preferencia de visita',
      'tipo de visita'
    ]),
    preferredTime: findHeader_(currentHeaders, [
      'horario de cita',
      'horario preferido',
      'horario de contacto'
    ]),
    source: findHeader_(currentHeaders, ['source', 'origen']),
    submissionId: findHeader_(currentHeaders, ['id de envio', 'submission id']),
    attendeeNumber: findHeader_(currentHeaders, ['invitado #', 'numero de invitado'])
  };

  var required = ['timestamp', 'company', 'companyPhone', 'attendee', 'phone', 'email'];
  for (var i = 0; i < required.length; i++) {
    if (indexes[required[i]] < 0) {
      throw new Error(
        'No se reconoció la columna requerida "' + required[i] + '". No se modificó la hoja.'
      );
    }
  }

  var rowCount = Math.max(sheet.getLastRow() - 1, 0);
  // La copia se crea antes de cambiar el historial, pero no para una hoja vacía.
  if (rowCount > 0) {
    var backup = sheet.copyTo(spreadsheet);
    backup.setName(uniqueBackupName_(spreadsheet));
  }
  var oldRows = rowCount
    ? sheet.getRange(2, 1, rowCount, lastColumn).getValues()
    : [];
  var migratedRows = oldRows.map(function (row, index) {
    return [
      valueAt_(row, indexes.timestamp),
      valueAt_(row, indexes.company),
      valueAt_(row, indexes.companyPhone),
      valueAt_(row, indexes.attendee),
      valueAt_(row, indexes.jobTitle),
      valueAt_(row, indexes.phone),
      valueAt_(row, indexes.email),
      valueAt_(row, indexes.visit),
      valueAt_(row, indexes.preferredTime),
      valueAt_(row, indexes.source),
      valueAt_(row, indexes.submissionId),
      valueAt_(row, indexes.attendeeNumber) || index + 1
    ];
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (migratedRows.length) {
    sheet.getRange(2, 1, migratedRows.length, HEADERS.length).setValues(migratedRows);
  }
  formatSheet_(sheet);
}

function formatSheet_(sheet) {
  var header = sheet.getRange(1, 1, 1, HEADERS.length);
  header.setFontWeight('bold');
  header.setBackground('#0a1020');
  header.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  var widths = [160, 220, 150, 220, 190, 150, 220, 220, 190, 120, 230, 90];
  widths.forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
}

function normalizeHeader_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim();
}

function findHeader_(headers, aliases) {
  var normalized = headers.map(normalizeHeader_);
  for (var i = 0; i < aliases.length; i++) {
    var index = normalized.indexOf(normalizeHeader_(aliases[i]));
    if (index >= 0) return index;
  }
  return -1;
}

function valueAt_(row, index) {
  return index >= 0 ? row[index] : '';
}

function uniqueBackupName_(spreadsheet) {
  var zone = Session.getScriptTimeZone() || 'America/Santo_Domingo';
  var stamp = Utilities.formatDate(new Date(), zone, 'yyyyMMdd-HHmmss');
  var name = 'Registros respaldo ' + stamp;
  if (spreadsheet.getSheetByName(name)) name += '-' + Utilities.getUuid().slice(0, 6);
  return name;
}

function isDuplicateSubmission_(sheet, submissionId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var rows = Math.min(1000, lastRow - 1);
  var ids = sheet.getRange(lastRow - rows + 1, 11, rows, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === submissionId) return true;
  }
  return false;
}

/**
 * Ejecute esta función una vez después de pegar el código. Crea un respaldo,
 * migra las columnas anteriores y deja la hoja preparada para el contrato v4.
 */
function prepararHoja() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    getSheet_();
  } finally {
    lock.releaseLock();
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('Hoja "' + SHEET_NAME + '" lista.');
}

/**
 * Corrige filas que una implementación antigua escribió después de migrar los
 * encabezados al contrato v3. El cargo no llegó al servidor antiguo y debe
 * completarse manualmente.
 */
function repararFilasDesalineadas() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      SpreadsheetApp.getActiveSpreadsheet().toast('No hay filas para revisar.');
      return;
    }

    var range = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    var rows = range.getValues();
    var repaired = 0;

    rows.forEach(function (row) {
      var misplacedPhone = row[4];
      var misplacedEmail = row[5];
      var misplacedVisit = row[6];
      var currentVisit = row[7];

      if (
        isPhone_(misplacedPhone) &&
        isEmail_(String(misplacedEmail).toLowerCase()) &&
        isVisitLabel_(misplacedVisit) &&
        !currentVisit
      ) {
        row[4] = 'PENDIENTE DE COMPLETAR';
        row[5] = misplacedPhone;
        row[6] = String(misplacedEmail).toLowerCase();
        row[7] = misplacedVisit;
        repaired += 1;
      }
    });

    if (repaired) range.setValues(rows);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      repaired + ' fila(s) desalineada(s) reparada(s).'
    );
  } finally {
    lock.releaseLock();
  }
}

function isVisitLabel_(value) {
  var text = String(value || '');
  for (var key in VISIT_LABELS) {
    if (VISIT_LABELS[key] === text) return true;
  }
  return false;
}
