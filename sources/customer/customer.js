function loadJSON(key, fallback){ try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
function saveJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

var currentUser = loadJSON('bb_user', null);
var reservations = BBDatabase.reservations();

function setActiveNavLink(){
  var currentFile = window.location.pathname.split('/').pop() || 'index.html';
  var pageDefaultHashes = {
    'index.html': '#home',
    'customer_rooms.html': '#rooms',
    'customer_reserve.html': '#reserve',
    'customer_track.html': '#track'
  };
  var currentHash = window.location.hash || pageDefaultHashes[currentFile] || '#home';
  document.querySelectorAll('.nav-links a').forEach(function(link){
    var href = link.getAttribute('href') || '';
    var parts = href.split('#');
    var linkFile = parts[0] || currentFile;
    var linkHash = parts[1] ? '#' + parts[1] : '';
    var samePage = linkFile === currentFile || (linkFile === 'index.html' && currentFile === '');
    var isActive = (samePage && linkHash && (linkHash === currentHash || (linkFile === '' && currentFile !== 'index.html'))) ||
      (samePage && !linkHash && !currentHash) ||
      (!samePage && linkFile === currentFile);
    link.classList.toggle('active', isActive);
  });
}
setActiveNavLink();

var toastTimer;
function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2600);
}

function initCustomerMessenger(){
  if(document.getElementById('customerMessenger')) return;
  var toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'customer-messenger-toggle'; toggle.setAttribute('aria-label','Chat with front desk');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9.4 9.4 0 0 1-4-.9L3 20l1.2-4.1A8 8 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.3 8.4 8.4 0 0 1 9 8.3Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>';
  var panel = document.createElement('section'); panel.id = 'customerMessenger'; panel.className = 'customer-messenger'; panel.setAttribute('aria-label','Chat with front desk');
  panel.innerHTML = '<div class="customer-messenger-head"><div class="customer-messenger-avatar">BB</div><div class="customer-messenger-title"><strong>Balay Bato Front Desk</strong><span>Usually replies within a few hours</span></div><button type="button" class="customer-messenger-close" aria-label="Close chat">×</button></div><div class="customer-messenger-body" id="customerMessageBody"></div><form class="customer-messenger-compose" id="customerMessageForm"><input id="customerMessageInput" type="text" placeholder="Message front desk..." autocomplete="off" aria-label="Message front desk"><button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form><div class="customer-messenger-foot">This conversation is only with the Balay Bato front desk.</div>';
  document.body.appendChild(toggle); document.body.appendChild(panel);
  var body = panel.querySelector('#customerMessageBody');
  window.updateCustomerMessengerVisibility = function(){
    var signedIn = !!currentUser;
    toggle.style.display = signedIn ? 'flex' : 'none';
    if(!signedIn) panel.classList.remove('open');
  };
  window.updateCustomerMessengerVisibility();
  function render(){
    if(!currentUser){ body.innerHTML = '<div class="customer-messenger-login">Log in to chat directly with the front desk.<br><button type="button" class="btn btn-primary btn-sm" onclick="openAuth(\'login\')">Log in / Sign up</button></div>'; return; }
    var messages = BBMessages.seed(currentUser.email);
    body.innerHTML = '<div class="customer-message-date">Conversation with the front desk</div>';
    messages.forEach(function(message){ body.innerHTML += '<div class="customer-message '+message.from+'">'+message.text.replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];})+'<small>'+message.time+'</small></div>'; });
    body.scrollTop = body.scrollHeight;
  }
  toggle.addEventListener('click', function(){ panel.classList.toggle('open'); if(panel.classList.contains('open')) render(); });
  panel.querySelector('.customer-messenger-close').addEventListener('click', function(){ panel.classList.remove('open'); });
  panel.querySelector('#customerMessageForm').addEventListener('submit', function(e){ e.preventDefault(); var input = panel.querySelector('#customerMessageInput'); var value = input.value.trim(); if(!currentUser){ openAuth('login'); return; } if(value){ BBMessages.send(currentUser.email,'customer',value); input.value=''; render(); } });
  BBMessages.onChange(function(){ if(panel.classList.contains('open')) render(); });
}
initCustomerMessenger();

var rooms = BBDatabase.rooms().map(function(r){ r.price = r.rate; return r; });
var galleryIndex = {};
function renderRooms(filter){
  var grid = document.getElementById('roomsGrid');
  if(!grid) return;
  grid.innerHTML = '';
  rooms.filter(function(r){ return filter === 'all' || r.status === filter; }).forEach(function(r){
    galleryIndex[r.no] = 0;
    var imgs = r.images.map(function(src,i){ return '<img src="'+src+'" alt="Room '+r.no+' - '+r.type+' image '+(i+1)+'" class="'+(i===0?'show':'')+'" data-i="'+i+'" loading="'+(i===0?'eager':'lazy')+'" decoding="async" fetchpriority="'+(i===0?'high':'low')+'">'; }).join('');
    var dots = r.images.map(function(_,i){ return '<span class="'+(i===0?'on':'')+'"></span>'; }).join('');
    var chips = r.amenities.map(function(a){ return '<span class="mini-chip">'+a+'</span>'; }).join('');
    var reserveBtn = r.status === 'available'
      ? '<button class="btn btn-teal btn-sm btn-block" onclick=\'reserveRoom("'+r.no+'")\'>Reserve this room</button>'
      : '<button class="btn btn-outline btn-sm btn-block" disabled>' + (r.status === 'occupied' ? 'Currently occupied' : 'Under maintenance') + '</button>';
    var card = document.createElement('div');
    card.className = 'card room-card';
    card.innerHTML =
      '<div class="room-gallery" data-room="'+r.no+'">' +
        '<span class="room-status ' + r.status + '">' + r.status.charAt(0).toUpperCase()+r.status.slice(1) + '</span>' +
        imgs +
        (r.images.length>1 ? '<button class="gallery-btn prev" onclick=\'shiftGallery("'+r.no+'",-1)\'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><button class="gallery-btn next" onclick=\'shiftGallery("'+r.no+'",1)\'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button><div class="gallery-dots">'+dots+'</div>' : '') +
      '</div>' +
      '<div class="room-body">' +
        '<div class="rtop"><div><div class="rno">Room ' + r.no + '</div><div class="rtype">' + r.type + '</div></div>' +
        '<div class="rprice">₱' + r.price.toLocaleString() + '<small>per night</small></div></div>' +
        '<div class="rcap">' + r.cap + ' pax capacity</div>' +
        '<div class="chip-row">' + chips + '</div>' +
        reserveBtn +
      '</div>';
    grid.appendChild(card);
  });
}
function shiftGallery(no, dir){
  var room = rooms.find(function(r){ return r.no === no; });
  var wrap = document.querySelector('.room-gallery[data-room="'+no+'"]');
  var imgs = wrap.querySelectorAll('img');
  var dots = wrap.querySelectorAll('.gallery-dots span');
  var i = galleryIndex[no];
  i = (i + dir + room.images.length) % room.images.length;
  galleryIndex[no] = i;
  imgs.forEach(function(img,idx){ img.classList.toggle('show', idx===i); });
  dots.forEach(function(d,idx){ d.classList.toggle('on', idx===i); });
}
renderRooms('all');
document.querySelectorAll('#roomFilters .pill').forEach(function(p){
  p.addEventListener('click', function(){
    document.querySelectorAll('#roomFilters .pill').forEach(function(x){ x.classList.remove('active'); });
    p.classList.add('active');
    renderRooms(p.dataset.status);
  });
});

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
var legacyAuthModal = document.getElementById('authOverlay');
if(legacyAuthModal) legacyAuthModal.remove();
function openAuth(tab){
  var destination = window.location.pathname.split('/').pop() || 'index.html';
  var query = window.location.search || '';
  var redirect = destination + query + (window.location.hash || '');
  try { sessionStorage.removeItem('bb_login_slide'); } catch(e) {}
  window.location.href = 'login.html?mode=' + encodeURIComponent(tab || 'login') + '&redirect=' + encodeURIComponent(redirect);
}
function switchAuthTab(tab){
  var loginTab = document.getElementById('tabLogin');
  var signupTab = document.getElementById('tabSignup');
  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  if(loginTab) loginTab.classList.toggle('active', tab==='login');
  if(signupTab) signupTab.classList.toggle('active', tab==='signup');
  if(loginForm) loginForm.style.display = tab==='login' ? 'block' : 'none';
  if(signupForm) signupForm.style.display = tab==='signup' ? 'block' : 'none';
}
function toggleUserMenu(e){
  if(e) e.stopPropagation();
  var menu = document.getElementById('userMenu');
  if(menu) menu.classList.toggle('open');
}
function closeUserMenu(){
  var menu = document.getElementById('userMenu');
  if(menu) menu.classList.remove('open');
}
function openProfile(){
  closeUserMenu();
  showToast('Profile: ' + (currentUser && currentUser.name ? currentUser.name : 'Guest'));
}
document.addEventListener('click', closeUserMenu);
function refreshAuthUI(){
  var guestEl = document.getElementById('guestActions');
  var userEl = document.getElementById('userActions');
  if(!guestEl || !userEl) return;
  if(currentUser){
    guestEl.style.display = 'none';
    userEl.style.display = 'block';
    var displayName = String(currentUser.name || currentUser.email || 'Guest').trim();
    document.getElementById('userName').textContent = displayName.split(' ')[0];
    document.getElementById('userAvatar').textContent = displayName.split(/\s+/).map(function(n){return n[0];}).slice(0,2).join('').toUpperCase();
  } else {
    guestEl.style.display = 'block';
    userEl.style.display = 'none';
  }
}
function handleLogin(e){
  e.preventDefault();
  var email = document.getElementById('liEmail').value;
  currentUser = {name: email.split('@')[0].replace(/[._]/g,' '), email: email};
  BBDatabase.saveUser(currentUser);
  saveJSON('bb_user', currentUser);
  refreshAuthUI();
  closeModal('authOverlay');
  showToast('Welcome back, ' + currentUser.name.split(' ')[0] + '!');
  renderTrack();
  renderMainReservationState();
  continuePendingReservation();
  return false;
}
function handleSignup(e){
  e.preventDefault();
  currentUser = {name: document.getElementById('suName').value, email: document.getElementById('suEmail').value, phone: document.getElementById('suPhone').value};
  BBDatabase.saveUser(currentUser);
  saveJSON('bb_user', currentUser);
  refreshAuthUI();
  closeModal('authOverlay');
  showToast('Account created — welcome, ' + currentUser.name.split(' ')[0] + '!');
  renderTrack();
  renderMainReservationState();
  continuePendingReservation();
  return false;
}
function socialLogin(provider){
  currentUser = {name: provider === 'Facebook' ? 'Facebook User' : 'Google User', email: provider.toLowerCase() + 'user@example.com'};
  BBDatabase.saveUser(currentUser);
  saveJSON('bb_user', currentUser);
  refreshAuthUI();
  closeModal('authOverlay');
  showToast('Signed in with ' + provider);
  renderTrack();
  renderMainReservationState();
  continuePendingReservation();
}
function logoutUser(){
  currentUser = null;
  localStorage.removeItem('bb_user');
  if(typeof window.updateCustomerMessengerVisibility === 'function') window.updateCustomerMessengerVisibility();
  refreshAuthUI();
  renderTrack();
  showToast('Logged out');
}
refreshAuthUI();

var activeReserveRoom = null;
var pendingReserveRoom = null;
var selectedWallet = 'GCash';
var proofDataUrl = '';
function reserveRoom(no){
  if(!currentUser){
    var destination = 'customer_reserve.html?room=' + encodeURIComponent(no);
    try { sessionStorage.removeItem('bb_login_slide'); } catch(e) {}
    window.location.href = 'login.html?mode=signup&redirect=' + encodeURIComponent(destination);
    return;
  }
  window.location.href = 'customer_reserve.html?room=' + encodeURIComponent(no);
}
function continuePendingReservation(){
  if(pendingReserveRoom === null) return;
  var no = pendingReserveRoom;
  pendingReserveRoom = null;
  window.location.href = 'customer_reserve.html?room=' + encodeURIComponent(no);
}
function openReserve(no){
  if(!document.getElementById('reserveOverlay')){ window.location.href = 'customer_reserve.html?room=' + encodeURIComponent(no); return; }
  if(!currentUser){ showToast('Please log in to reserve a room'); openAuth('login'); return; }
  activeReserveRoom = rooms.find(function(r){ return r.no === no; });
  document.getElementById('resRoomTitle').textContent = 'Reserve Room ' + no;
  document.getElementById('reserveStep1').style.display = 'block';
  document.getElementById('reserveStep2').style.display = 'none';
  document.getElementById('resIn').value = '';
  document.getElementById('resOut').value = '';
  document.getElementById('resGuests').value = 2;
  document.getElementById('resContact').value = '';
  document.getElementById('resRef').value = '';
  proofDataUrl = '';
  document.getElementById('fileDropText').textContent = 'Tap to upload image';
  openModal('reserveOverlay');
}
document.querySelectorAll('#walletGrid .wallet-opt').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('#walletGrid .wallet-opt').forEach(function(x){ x.classList.remove('on'); });
    btn.classList.add('on');
    selectedWallet = btn.dataset.w;
    document.getElementById('walletName').textContent = selectedWallet;
  });
});
function goToPayment(e){
  e.preventDefault();
  var ci = document.getElementById('resIn').value;
  var co = document.getElementById('resOut').value;
  var nights = Math.max(1, Math.round((new Date(co) - new Date(ci)) / 86400000) || 1);
  document.getElementById('sumRoom').textContent = 'Room ' + activeReserveRoom.no + ' · ' + activeReserveRoom.type;
  document.getElementById('sumNights').textContent = nights + ' night(s)';
  document.getElementById('sumTotal').textContent = '₱' + (nights * activeReserveRoom.price).toLocaleString();
  document.getElementById('reserveStep1').style.display = 'none';
  document.getElementById('reserveStep2').style.display = 'block';
  return false;
}
function handleProof(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    proofDataUrl = ev.target.result;
    document.getElementById('fileDropText').innerHTML = 'Proof uploaded ✓<br><img src="'+proofDataUrl+'">';
  };
  reader.readAsDataURL(file);
}
function submitReservation(e){
  e.preventDefault();
  var ci = document.getElementById('resIn').value;
  var co = document.getElementById('resOut').value;
  var nights = Math.max(1, Math.round((new Date(co) - new Date(ci)) / 86400000) || 1);
  var record = {
    id: Date.now(),
    userEmail: currentUser.email,
    roomNo: activeReserveRoom.no,
    roomType: activeReserveRoom.type,
    checkin: ci, checkout: co,
    guests: document.getElementById('resGuests').value,
    contact: document.getElementById('resContact').value,
    wallet: selectedWallet,
    ref: document.getElementById('resRef').value,
    proof: proofDataUrl,
    amount: nights * activeReserveRoom.price,
    status: 'pending'
  };
  BBDatabase.addReservation(record);
  reservations = BBDatabase.reservations();
  closeModal('reserveOverlay');
  showToast('Reservation submitted — awaiting front desk verification');
  renderTrack();
  document.getElementById('track').scrollIntoView({behavior:'smooth'});
  return false;
}

function renderTrack(){
  var list = document.getElementById('trackList');
  if(!list) return;
  list.classList.remove('empty-state');
  if(!currentUser){
    list.classList.add('empty-state');
    list.innerHTML = '<div class="empty-note"><svg class="empty-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>Log in to see your reservations.</span><button class="btn btn-primary btn-sm" onclick="openAuth(\'login\')">Log in / Sign up</button></div>';
    return;
  }
  var mine = reservations.filter(function(r){ return r.userEmail === currentUser.email; }).reverse();
  if(mine.length === 0){
    list.classList.add('empty-state');
    list.innerHTML = '<div class="empty-note"><svg class="empty-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/><path d="m9 14 2 2 4-4"/></svg><span>No reservations yet.</span><small>Browse rooms to make your first booking.</small></div>';
    return;
  }
  list.innerHTML = '';
  mine.forEach(function(r){
    var row = document.createElement('div');
    row.className = 'card track-card';
    row.innerHTML =
      '<div class="track-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 3v6M16 3v6"/></svg></div>' +
      '<div class="track-info"><div class="n">Room ' + r.roomNo + ' · ' + r.roomType + '</div>' +
      '<div class="d">' + r.checkin + ' → ' + r.checkout + ' · ₱' + r.amount.toLocaleString() + ' via ' + r.wallet + ' · Ref ' + r.ref + '</div>' +
      '<button type="button" class="btn btn-outline btn-sm view-details-btn" onclick="viewReservationDetails(\'' + r.id + '\')">View details</button></div>' +
      '<span class="status-tag ' + r.status + '">' + r.status.charAt(0).toUpperCase() + r.status.slice(1) + '</span>';
    list.appendChild(row);
  });
}
function viewReservationDetails(id){
  var reservation = reservations.find(function(r){ return String(r.id) === String(id); });
  if(!reservation) return;
  var set = function(elementId, value){
    var element = document.getElementById(elementId);
    if(element) element.textContent = value || 'Not provided';
  };
  set('detailRoom', 'Room ' + reservation.roomNo + ' · ' + reservation.roomType);
  set('detailDates', reservation.checkin + ' → ' + reservation.checkout);
  set('detailTime', reservation.checkinTime || '14:00');
  set('detailGuests', reservation.guests);
  set('detailName', reservation.guest);
  set('detailEmail', reservation.userEmail);
  set('detailContact', reservation.contact);
  set('detailWallet', reservation.wallet);
  set('detailRef', reservation.ref);
  set('detailTotal', '₱' + Number(reservation.amount || 0).toLocaleString());
  set('detailStatus', reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1));
  openModal('detailsOverlay');
}
renderTrack();

BBDatabase.onChange(function(data){
  rooms = data.rooms.map(function(r){ r.price = r.rate; return r; });
  reservations = data.reservations;
  renderRooms('all');
  renderTrack();
});

document.querySelectorAll('.mobile-menu a').forEach(function(a){
  a.addEventListener('click', function(){ document.getElementById('mobileMenu').classList.remove('open'); });
});

/* Full-page reservation form */
var mainReserveRoom = null;
function getMainNights(){
  var ci = document.getElementById('mainIn').value;
  var co = document.getElementById('mainOut').value;
  var nights = ci && co ? Math.ceil((new Date(co) - new Date(ci)) / 86400000) : 0;
  return nights > 0 ? nights : 0;
}
function renderMainRoom(){
  var panel = document.getElementById('selectedRoomPanel');
  if(!panel || !mainReserveRoom) return;
  var image = mainReserveRoom.images && mainReserveRoom.images[0] ? mainReserveRoom.images[0] : '';
  panel.innerHTML = '<div class="selected-room-image"' + (image ? ' style="background-image:url(\''+image+'\')"' : '') + '><span>Selected room</span></div>' +
    '<div class="selected-room-body"><div class="eyebrow">Your room</div><h3>Room '+mainReserveRoom.no+'</h3><p class="room-type">'+mainReserveRoom.type+' · '+mainReserveRoom.floor+'</p><div class="chip-row">'+mainReserveRoom.amenities.map(function(a){return '<span class="mini-chip">'+a+'</span>';}).join('')+'</div><div class="selected-room-rate">₱'+mainReserveRoom.price.toLocaleString()+' <small>per night</small></div><a href="customer_rooms.html" class="change-room">Change room</a></div>';
}
function renderMainReservationState(){
  var panel = document.getElementById('selectedRoomPanel');
  var formCard = document.getElementById('reservationFormCard');
  if(!panel) return;

  if(!currentUser){
    if(formCard) formCard.style.display = 'none';
    panel.innerHTML = '<div class="selected-room-empty empty-note"><svg class="empty-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>Log in to see your reservations.</span><button class="btn btn-primary btn-sm" onclick="openAuth(\'login\')">Log in / Sign up</button></div>';
    return;
  }

  if(!mainReserveRoom){
    if(formCard) formCard.style.display = 'none';
    panel.innerHTML = '<div class="selected-room-empty"><div class="step-num" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5"/><path d="M3 16h18"/><path d="M5 11V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3"/><path d="M3 18v2M21 18v2"/></svg></div><h3>Choose a room</h3><p>Select an available room from the <a href="customer_rooms.html">Rooms page</a> to see it here.</p><a class="btn btn-outline btn-block" href="customer_rooms.html">Browse available rooms</a></div>';
    return;
  }

  if(formCard) formCard.style.display = '';
  renderMainRoom();
}
function updateMainSummary(){
  var nights = getMainNights();
  var nightsEl = document.getElementById('mainNights');
  var totalEl = document.getElementById('mainTotal');
  if(nightsEl) nightsEl.textContent = nights ? nights + ' night' + (nights === 1 ? '' : 's') : '.....';
  if(totalEl) totalEl.textContent = mainReserveRoom && nights ? '₱' + (nights * mainReserveRoom.price).toLocaleString() : '.....';
}
function updatePaymentFields(){
  var online = document.querySelector('input[name="paymentMethod"]:checked').value === 'online';
  document.getElementById('onlinePaymentFields').style.display = online ? 'block' : 'none';
  document.getElementById('mainRef').required = online;
}
function updateWalletNumber(){
  var wallet = document.getElementById('mainWallet');
  var label = document.getElementById('mainWalletLabel');
  var number = document.getElementById('mainWalletNumber');
  if(!wallet || !label || !number) return;
  label.textContent = wallet.value + ' number';
  number.textContent = '0917 000 1234';
}
function submitMainReservation(e){
  e.preventDefault();
  if(!mainReserveRoom){ showToast('Please choose an available room first'); return false; }
  if(!currentUser){ document.getElementById('reservationLoginNotice').style.display = 'block'; openAuth('login'); return false; }
  var nights = getMainNights();
  if(!nights){ showToast('Check-out must be after check-in'); return false; }
  var method = document.querySelector('input[name="paymentMethod"]:checked').value;
  var proof = '';
  var file = document.getElementById('mainProof').files[0];
  var save = function(data){
    BBDatabase.addReservation({id:Date.now(),userEmail:currentUser.email,guest:document.getElementById('mainName').value,roomNo:mainReserveRoom.no,roomType:mainReserveRoom.type,checkin:document.getElementById('mainIn').value,checkout:document.getElementById('mainOut').value,checkinTime:document.getElementById('mainTime').value,guests:document.getElementById('mainGuests').value,contact:document.getElementById('mainContact').value,wallet:method === 'online' ? document.getElementById('mainWallet').value : 'Pay at hotel',ref:method === 'online' ? document.getElementById('mainRef').value : '',proof:data,amount:nights * mainReserveRoom.price,status:'pending'});
    reservations = BBDatabase.reservations(); showToast('Reservation submitted — awaiting confirmation'); setTimeout(function(){ window.location.href='customer_track.html'; }, 700);
  };
  if(file){ var reader = new FileReader(); reader.onload = function(ev){ save(ev.target.result); }; reader.readAsDataURL(file); } else save(proof);
  return false;
}
function initMainReservation(){
  var form = document.getElementById('reservationForm');
  if(!form) return;
  var no = new URLSearchParams(window.location.search).get('room');
  // Room numbers can come from the URL as strings while older/admin data may
  // store them as numbers. Compare their displayed values instead of types.
  mainReserveRoom = rooms.find(function(r){ return String(r.no) === String(no) && r.status === 'available'; });
  renderMainReservationState();
  ['mainIn','mainOut'].forEach(function(id){ document.getElementById(id).addEventListener('change', updateMainSummary); });
  document.querySelectorAll('input[name="paymentMethod"]').forEach(function(r){ r.addEventListener('change', updatePaymentFields); });
  document.getElementById('mainWallet').addEventListener('change', updateWalletNumber);
  updatePaymentFields(); updateWalletNumber(); updateMainSummary();
}
initMainReservation();
