// Pantalla de acceso compartido: enlaces privados y acciones separados.
// Nunca se incrusta el token en HTML; el navegador lo añade solo tras cargar.
const icons={
 link:'<path d="M14 11 11 14a6 6 0 0 0 8 8l4-4a6 6 0 0 0-8-8"/><path d="m18 21 3-3a6 6 0 0 0-8-8l-4 4a6 6 0 0 0 8 8"/>',
 download:'<rect x="5" y="5" width="22" height="22" rx="4"/><path d="M16 8v12m-5-5 5 5 5-5M10 24h12"/>',
 shield:'<path d="M16 2 27 7v9c0 7-5 11-11 14C10 27 5 23 5 16V7Z"/><path d="m11 16 3 3 7-7"/>',
 copy:'<rect x="9" y="9" width="18" height="18" rx="3"/><path d="M21 9V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h3"/>',
 refresh:'<path d="M26 10A11 11 0 0 0 7 8L4 11V4m2 18a11 11 0 0 0 19 2l3-3v7"/>',
 arrow:'<path d="M5 16h22m-8-8 8 8-8 8"/>',
 check:'<path d="m6 16 7 7L27 9"/>'
};
const ico=type=>'<svg viewBox="0 0 32 32" aria-hidden="true">'+icons[type]+'</svg>';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function profileAccessMarkup(name=''){
 const n=String(name||'').trim(),label=n||'Colono invitado';
 return '<div class="profile-screen">'+
  '<header class="profile-identity"><span class="profile-symbol" aria-hidden="true"><b>×</b><b>○</b></span><div><small>IDENTIDAD DEL COLONO</small><strong>'+esc(label)+'</strong><p>Tu identidad para Mundo y Duelo.</p></div></header>'+
  '<section class="profile-section profile-alias" aria-labelledby="profile-alias-title"><div class="profile-section-title"><span class="profile-section-number">01</span><div><h3 id="profile-alias-title">Tu apodo</h3><p>El nombre que verán los demás colonos.</p></div></div>'+
  '<form id="profile-form" class="profile-alias-form"><label class="sr-only" for="profile-name">Tu apodo</label><input id="profile-name" name="name" value="'+esc(n)+'" placeholder="Elige tu apodo" minlength="2" maxlength="18" autocomplete="nickname" required><button type="submit">Guardar</button></form><p id="profile-name-status" class="profile-status" role="status" aria-live="polite"></p></section>'+
  '<section class="profile-section profile-transfer" aria-labelledby="profile-transfer-title"><div class="profile-section-title"><span class="profile-section-number">02</span><div><h3 id="profile-transfer-title">Lleva tu perfil contigo</h3><p>Abre tus partidas online en otro navegador o dispositivo.</p></div></div>'+
  '<div class="profile-step"><span class="profile-step-icon">'+ico('link')+'</span><div class="profile-step-copy"><strong>Tu enlace privado</strong><small>Genera una vez. Podrás copiarlo siempre que quieras.</small></div></div>'+
  '<div class="profile-link-actions"><button type="button" class="primary" data-action="profile-generate" id="profile-generate">'+ico('link')+'<span>Generar enlace</span></button><button type="button" data-action="profile-copy-ready" id="profile-copy-ready" hidden>'+ico('copy')+'<span>Copiar enlace</span></button><button type="button" data-action="profile-share" id="profile-share" hidden>'+ico('arrow')+'<span>Compartir</span></button></div>'+
  '<div class="profile-ready" id="profile-ready" hidden><span class="profile-ready-tag">'+ico('check')+' ENLACE DISPONIBLE</span><textarea id="profile-export" aria-label="Tu enlace privado de acceso" rows="2" readonly spellcheck="false"></textarea><p>Este enlace abre tu perfil en otro navegador. Guárdalo como una contraseña.</p><button type="button" class="profile-renew-button" data-action="profile-renew">'+ico('refresh')+' Renovar enlace</button></div>'+
  '<div class="profile-renew-confirm" id="profile-renew-confirm" hidden><strong>¿Invalidar el enlace anterior?</strong><p>Los enlaces antiguos dejarán de funcionar. Tus partidas no se borrarán.</p><div><button type="button" data-action="profile-renew-cancel">Cancelar</button><button type="button" data-action="profile-renew-confirm" class="primary">Renovar ahora</button></div></div>'+
  '<p id="profile-copy-status" class="profile-status" role="status" aria-live="polite"></p>'+
  '<p class="profile-security">'+ico('shield')+' <span><strong>Acceso privado.</strong> Quien tenga el enlace podrá entrar en tu perfil. No lo compartas públicamente.</span></p></section>'+
  '<section class="profile-section profile-restore" aria-labelledby="profile-restore-title"><div class="profile-section-title"><span class="profile-section-number">03</span><div><h3 id="profile-restore-title">¿Estás en otro navegador?</h3><p>Pega aquí el enlace que creaste en tu dispositivo anterior.</p></div></div>'+
  '<form id="profile-import" class="profile-import-form"><label class="sr-only" for="profile-link">Enlace de tu perfil</label><input id="profile-link" type="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Pega aquí tu enlace de #3" required><button type="submit">'+ico('download')+' Cargar mi perfil</button></form><p id="profile-restore-status" class="profile-status" role="status" aria-live="polite"></p></section>'+
  '<p class="profile-footnote">Mundo, Duelo y tu clasificación están asociados a tu identidad online. Las partidas de VS máquina y Sin conexión permanecen en cada navegador.</p>'+
  '</div>';
}
