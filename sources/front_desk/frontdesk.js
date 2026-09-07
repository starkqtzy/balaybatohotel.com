
function setActiveNav(view){
  document.querySelectorAll('.nav-item, .side-item').forEach(function(el){ el.classList.toggle('active', el.dataset.view === view); });
}
function showView(view){
  if(view === 'logout'){ doLogout(); return; }
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  var target = document.getElementById('view-' + view);
  if(target) target.classList.add('active');
  setActiveNav(view);
  window.scrollTo({top:0, behavior:'smooth'});
}
document.querySelectorAll('[data-view]').forEach(function(btn){
  btn.addEventListener('click', function(){ showView(btn.dataset.view); });
});
document.querySelectorAll('[data-view="settings"] svg').forEach(function(icon){
  icon.outerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/></svg>';
});
var notificationButton = document.getElementById('notificationButton');
var notificationMenu = document.getElementById('notificationMenu');
var notificationList = document.getElementById('notificationList');
var notificationBadge = document.getElementById('notificationBadge');
var notificationStorageKey = 'bb_frontdesk_notifications_v1';
var seenReservationStorageKey = 'bb_frontdesk_seen_reservations_v1';
var notifications = [];

function readNotificationData(){
  try { notifications = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]'); } catch(e) { notifications = []; }
  if(!Array.isArray(notifications)){ notifications = []; }
}
function saveNotificationData(){
  try { localStorage.setItem(notificationStorageKey, JSON.stringify(notifications.slice(0, 30))); } catch(e) {}
}
function formatNotificationTime(value){
  var date = new Date(value);
  return isNaN(date.getTime()) ? 'Just now' : date.toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
}
function renderNotifications(){
  var unread = notifications.filter(function(item){ return !item.read; }).length;
  notificationBadge.textContent = unread > 99 ? '99+' : unread;
  notificationBadge.hidden = unread === 0;
  notificationList.innerHTML = '';
  if(!notifications.length){
    notificationList.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
    return;
  }
  notifications.forEach(function(item){
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'notification-item' + (item.read ? '' : ' unread');
    row.innerHTML = '<span class="notification-dot"></span><span class="notification-copy"><strong></strong><small></small></span>';
    row.querySelector('strong').textContent = item.title;
    row.querySelector('small').textContent = item.text + ' · ' + formatNotificationTime(item.time);
    row.addEventListener('click', function(){
      item.read = true;
      saveNotificationData();
      renderNotifications();
      showView('reserve');
      closeNotificationMenu();
    });
    notificationList.appendChild(row);
  });
}
function openNotificationMenu(){
  notificationMenu.hidden = false;
  notificationButton.setAttribute('aria-expanded', 'true');
}
function closeNotificationMenu(){
  notificationMenu.hidden = true;
  notificationButton.setAttribute('aria-expanded', 'false');
}
function checkReservationNotifications(reservationData){
  var reservationsNow = reservationData || BBDatabase.reservations();
  var seen = [];
  try { seen = JSON.parse(localStorage.getItem(seenReservationStorageKey) || 'null'); } catch(e) { seen = null; }
  if(!Array.isArray(seen)){
    seen = reservationsNow.map(function(item){ return String(item.id); });
    try { localStorage.setItem(seenReservationStorageKey, JSON.stringify(seen)); } catch(e2) {}
    return;
  }
  var changed = false;
  reservationsNow.forEach(function(item){
    var id = String(item.id);
    if(seen.indexOf(id) !== -1){ return; }
    notifications.unshift({
      id: 'reservation-' + id,
      title: 'New reservation received',
      text: (item.guest || item.userEmail || 'A customer') + ' submitted a reservation for Room ' + (item.roomNo || '—'),
      time: new Date().toISOString(),
      read: false
    });
    seen.push(id);
    changed = true;
  });
  if(changed){ saveNotificationData(); renderNotifications(); showToast('New customer reservation received'); }
  try { localStorage.setItem(seenReservationStorageKey, JSON.stringify(seen)); } catch(e3) {}
}
readNotificationData();
renderNotifications();
checkReservationNotifications();
notificationButton.addEventListener('click', function(){
  notificationMenu.hidden ? openNotificationMenu() : closeNotificationMenu();
});
document.getElementById('markNotificationsRead').addEventListener('click', function(){
  notifications.forEach(function(item){ item.read = true; });
  saveNotificationData();
  renderNotifications();
});
document.addEventListener('click', function(event){
  if(!event.target.closest('.notification-wrap')){ closeNotificationMenu(); }
});
document.querySelector('[data-messages-button]').addEventListener('click', function(){ showView('messages'); });
var profileTrigger = document.getElementById('profileTrigger');
var profileMenu = document.getElementById('profileMenu');
function closeProfileMenu(){
  if(!profileMenu) return;
  profileMenu.hidden = true;
  profileTrigger.setAttribute('aria-expanded', 'false');
}
if(profileTrigger && profileMenu){
  profileTrigger.addEventListener('click', function(event){
    event.stopPropagation();
    var isOpen = !profileMenu.hidden;
    profileMenu.hidden = isOpen;
    profileTrigger.setAttribute('aria-expanded', String(!isOpen));
  });
  document.getElementById('profileButton').addEventListener('click', function(){
    closeProfileMenu();
    showToast('Profile: Front Desk Administrator');
  });
  document.addEventListener('click', function(event){
    if(!event.target.closest('.profile-wrap')) closeProfileMenu();
  });
}
function doLogout(){
  sessionStorage.removeItem('bb_frontdesk_authenticated');
  window.location.href = 'frontdesk_login.html';
}
var toastTimer;
function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2400);
}
function saveForm(e, msg){ e.preventDefault(); showToast(msg); return false; }
(function(){
  var h = new Date().getHours();
  document.getElementById('mobileGreet').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
})();

var rooms = BBDatabase.rooms();
var nextRoomId = rooms.reduce(function(max, room){ return Math.max(max, Number(room.id) || 0); }, 0) + 1;
var pendingImages = [];
var selectedAmenities = [];

document.querySelectorAll('#amenityGrid .amenity-chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    var a = chip.dataset.a;
    chip.classList.toggle('on');
    if(selectedAmenities.indexOf(a) === -1){ selectedAmenities.push(a); }
    else { selectedAmenities = selectedAmenities.filter(function(x){ return x !== a; }); }
  });
});
function handleImages(e){
  var files = Array.from(e.target.files || []);
  files.forEach(function(file){
    var reader = new FileReader();
    reader.onload = function(ev){
      pendingImages.push(ev.target.result);
      renderImgUpload();
    };
    reader.readAsDataURL(file);
  });
}
function renderImgUpload(){
  var wrap = document.getElementById('imgUpload');
  wrap.innerHTML = '';
  pendingImages.forEach(function(src){
    var img = document.createElement('img');
    img.className = 'img-thumb';
    img.src = src;
    wrap.appendChild(img);
  });
  var addLabel = document.createElement('label');
  addLabel.className = 'img-add';
  addLabel.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg><input type="file" accept="image/*" multiple style="display:none" onchange="handleImages(event)">';
  wrap.appendChild(addLabel);
}
function openRoomForm(room){
  var modal = document.getElementById('roomModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  var titleEl = document.getElementById('roomFormTitle');
  pendingImages = (room && room.images) ? room.images.slice() : [];
  selectedAmenities = (room && room.amenities) ? room.amenities.slice() : [];
  document.querySelectorAll('#amenityGrid .amenity-chip').forEach(function(chip){
    chip.classList.toggle('on', selectedAmenities.indexOf(chip.dataset.a) !== -1);
  });
  renderImgUpload();
  if(room){
    titleEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Edit room';
    document.getElementById('fRoomId').value = room.id;
    document.getElementById('fRoomNo').value = room.no;
    document.getElementById('fRoomType').value = room.type;
    document.getElementById('fRate').value = room.rate;
    document.getElementById('fCap').value = room.cap;
  } else {
    titleEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>New room';
    document.getElementById('roomForm').reset();
    document.getElementById('fRoomId').value = '';
  }
  document.getElementById('fRoomNo').focus();
}
function closeRoomForm(){
  var modal = document.getElementById('roomModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  document.getElementById('roomForm').reset();
  pendingImages = [];
  selectedAmenities = [];
}
document.getElementById('roomModal').addEventListener('click', function(e){
  if(e.target === this){ closeRoomForm(); }
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && document.getElementById('roomModal').classList.contains('open')){
    closeRoomForm();
  }
  if(e.key === 'Escape' && document.getElementById('bookingNotice').classList.contains('open')){
    closeBookingNotice();
  }
  if(e.key === 'Escape' && document.getElementById('bookingModal').classList.contains('open')){
    closeBookingForm();
  }
});
function submitRoomForm(e){
  e.preventDefault();
  var id = document.getElementById('fRoomId').value;
  var data = {
    no: document.getElementById('fRoomNo').value,
    type: document.getElementById('fRoomType').value,
    rate: Number(document.getElementById('fRate').value),
    cap: Number(document.getElementById('fCap').value),
    amenities: selectedAmenities.slice(),
    images: pendingImages.slice()
  };
  if(id){
    var idx = rooms.findIndex(function(r){ return r.id == id; });
    rooms[idx] = Object.assign(rooms[idx], data);
    showToast('Room ' + data.no + ' updated');
  } else {
    data.id = nextRoomId++;
    data.status = 'available';
    rooms.push(data);
    showToast('Room ' + data.no + ' added');
  }
  BBDatabase.saveRooms(rooms);
  closeRoomForm();
  renderRooms(currentRoomFilter);
  return false;
}
function deleteRoom(id){
  var room = rooms.find(function(r){ return r.id === id; });
  if(room && confirm('Delete Room ' + room.no + '? This cannot be undone.')){
    rooms = rooms.filter(function(r){ return r.id !== id; });
    BBDatabase.saveRooms(rooms);
    renderRooms(currentRoomFilter);
    showToast('Room ' + room.no + ' deleted');
  }
}
var currentRoomFilter = 'all';
function renderRooms(filter){
  currentRoomFilter = filter;
  var grid = document.getElementById('roomsGrid');
  grid.innerHTML = '';
  rooms.filter(function(r){ return filter === 'all' || r.status === filter; }).forEach(function(r){
    var card = document.createElement('div');
    card.className = 'room-card';
    var thumb = r.images && r.images[0] ? '<img class="room-thumb" src="'+r.images[0]+'">' : '<div class="room-thumb"></div>';
    var chips = (r.amenities||[]).slice(0,3).map(function(a){ return '<span class="mini-chip">'+a+'</span>'; }).join('');
    card.innerHTML =
      thumb +
      '<div class="room-body">' +
        '<div class="rtop"><div><div class="rno">' + r.no + '</div><div class="rtype">' + r.type + '</div></div>' +
        '<div class="rrate">₱' + r.rate.toLocaleString() + '</div></div>' +
        '<div class="rcap">' + r.cap + ' pax capacity</div>' +
        '<div class="chip-row">' + chips + '</div>' +
        '<div class="room-actions"><button class="btn btn-outline btn-sm" onclick="openRoomForm(rooms.find(function(x){return x.id===' + r.id + '}))">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteRoom(' + r.id + ')">Delete</button></div>' +
      '</div>';
    grid.appendChild(card);
  });
  renderBookedRooms();
  renderBookingRoomOptions();
}
function renderBookedRooms(){
  var grid = document.getElementById('bookedRoomsGrid');
  if(!grid){ return; }
  grid.innerHTML = '';
  rooms.forEach(function(room){
    var item = document.createElement('div');
    item.className = 'booked-room-item';
    item.innerHTML = '<div class="room-number">Rm ' + room.no + '</div>' +
      '<div class="room-type">' + room.type + '</div>' +
      '<span class="room-status ' + room.status + '">' + room.status + '</span>';
    grid.appendChild(item);
  });
}
function renderBookingRoomOptions(){
  var select = document.getElementById('bRoom');
  if(!select){ return; }
  var selected = select.value;
  select.innerHTML = '<option value="">Select room</option>';
  rooms.forEach(function(room){
    var option = document.createElement('option');
    option.value = room.no + ' · ' + room.type;
    option.textContent = room.no + ' · ' + room.type + ' — ' + room.status;
    option.disabled = room.status !== 'available';
    select.appendChild(option);
  });
  if(Array.from(select.options).some(function(option){ return option.value === selected && !option.disabled; })){
    select.value = selected;
  }
}
renderRooms('all');
document.querySelectorAll('#roomFilters .pill').forEach(function(p){
  p.addEventListener('click', function(){
    document.querySelectorAll('#roomFilters .pill').forEach(function(x){ x.classList.remove('active'); });
    p.classList.add('active');
    renderRooms(p.dataset.status);
  });
});

var reservations = BBDatabase.reservations().map(function(r){
  r.guest = r.guest || r.userEmail || 'Guest';
  r.room = (r.roomType || '') + ' - ' + r.roomNo;
  r.dates = r.dates || ((r.checkin || '') + ' - ' + (r.checkout || ''));
  r.amount = typeof r.amount === 'number' ? 'PHP ' + r.amount.toLocaleString() : r.amount;
  return r;
});
/* Legacy demo reservations retained only as migration reference:
var legacyReservations = [
  {id:1,guest:'Michael Tan',room:'Garden Suite · 306',dates:'Sep 5 – Sep 7',amount:'₱7,200',ref:'REF-8821-KM',status:'pending'},
  {id:2,guest:'Carla Dizon',room:'Deluxe Twin · 202',dates:'Sep 6 – Sep 8',amount:'₱5,600',ref:'REF-9042-QP',status:'pending'},
  {id:3,guest:'Robert Cruz',room:'Standard · 101',dates:'Sep 3 – Sep 4',amount:'₱1,800',ref:'REF-7710-LA',status:'confirmed'},
  {id:4,guest:'Ella Marasigan',room:'Family Room · 110',dates:'Aug 29 – Aug 31',amount:'₱8,400',ref:'REF-6634-WD',status:'rejected'}
 ];
*/
function renderReservations(filter){
  var list = document.getElementById('reserveList');
  list.innerHTML = '';
  reservations.filter(function(r){ return filter === 'all' || r.status === filter; }).forEach(function(r){
    var card = document.createElement('div');
    card.className = 'res-card';
    var actions = '';
    if(r.status === 'pending'){    
      actions = '<div class="btn-row" style="margin-top:12px;"><button class="btn btn-teal btn-sm" onclick="setResStatus(' + r.id + ',&quot;confirmed&quot;)">Confirm payment</button>' +
        '<button class="btn btn-danger btn-sm" onclick="setResStatus(' + r.id + ',&quot;rejected&quot;)">Reject</button></div>';
    }
    card.innerHTML =
      '<div class="res-top"><div><div class="res-guest">' + r.guest + '</div><div class="res-meta">' + r.room + ' · ' + r.dates + '</div></div>' +
      '<span class="status-tag ' + r.status + '">' + r.status.charAt(0).toUpperCase() + r.status.slice(1) + '</span></div>' +
      '<div class="ref-box"><span class="lbl">Reference number</span><span class="code">' + r.ref + '</span></div>' +
      '<div class="res-foot"><span class="res-amount">' + r.amount + '</span></div>' +
      actions;
    list.appendChild(card);
  });
  if(list.innerHTML === ''){ list.innerHTML = '<div class="card" style="text-align:center;color:var(--ink-faint);font-weight:600;font-size:13px;">No reservations in this filter.</div>'; }
}
function setResStatus(id, status){
  var r = reservations.find(function(x){ return x.id === id; });
  if(!r){
    showToast('Reservation could not be found');
    return;
  }
  r.status = status;
  BBDatabase.updateReservation(id, {status: status});
  renderReservations(currentResFilter);
  showToast(status === 'confirmed' ? 'Payment confirmed for ' + r.guest : 'Reservation rejected');
}
var currentResFilter = 'all';
renderReservations('all');
document.querySelectorAll('#resFilters .pill').forEach(function(p){
  p.addEventListener('click', function(){
    document.querySelectorAll('#resFilters .pill').forEach(function(x){ x.classList.remove('active'); });
    p.classList.add('active');
    currentResFilter = p.dataset.status;
    renderReservations(currentResFilter);
  });
});

var conversations = [
  {id:1,email:'michael@example.com',name:'Michael Tan',time:'10:42 AM',preview:'Thank you! Is breakfast included?',messages:[
    {from:'customer',text:'Hi, I have a reservation for September 5. Can I request a garden-facing room?',time:'10:36 AM'},
    {from:'staff',text:'Hi Michael! I noted your request. We will do our best to arrange it for you.',time:'10:39 AM'},
    {from:'customer',text:'Thank you! Is breakfast included?',time:'10:42 AM'}
  ]},
  {id:2,email:'carla@example.com',name:'Carla Dizon',time:'Yesterday',preview:'I already sent the payment reference.',messages:[
    {from:'customer',text:'Hello, I already sent the payment reference for my Deluxe Twin booking.',time:'Yesterday'},
    {from:'staff',text:'Thanks Carla. We are verifying it now and will update your reservation shortly.',time:'Yesterday'}
  ]},
  {id:3,email:'robert@example.com',name:'Robert Cruz',time:'Mon',preview:'What time is check-in?',messages:[
    {from:'customer',text:'What time is check-in and check-out?',time:'Mon'},
    {from:'staff',text:'Check-in starts at 2:00 PM and check-out is until 12:00 PM.',time:'Mon'}
  ]}
];
if(typeof BBMessages !== 'undefined'){
  conversations.forEach(function(conversation){
    BBMessages.seedConversation(conversation.email, conversation.messages);
  });
}
function syncCustomerConversations(){
  if(typeof BBMessages === 'undefined') return;
  var data = {};
  try { data = JSON.parse(localStorage.getItem(BBMessages.key) || '{}'); } catch(e) {}
  Object.keys(data).forEach(function(email){
    var messages = data[email] || [];
    if(!messages.length) return;
    var conversation = conversations.find(function(item){ return item.email === email; });
    if(!conversation){
      var user = BBDatabase.users().find(function(item){ return String(item.email).toLowerCase() === email; });
      var reservation = BBDatabase.reservations().find(function(item){ return String(item.userEmail || '').toLowerCase() === email; });
      conversation = {id:'customer-' + email, email:email, name:(user && user.name) || (reservation && reservation.guest) || email, time:messages[messages.length - 1].time, preview:messages[messages.length - 1].text, messages:messages};
      conversations.unshift(conversation);
    } else {
      conversation.messages = messages;
      conversation.time = messages[messages.length - 1].time;
      conversation.preview = messages[messages.length - 1].text;
    }
  });
}
var selectedConversationId = null;
function getInitials(name){ return name.split(' ').map(function(part){ return part[0]; }).slice(0,2).join(''); }
function escapeMessageText(value){
  return String(value || '').replace(/[&<>"']/g, function(character){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
  });
}
function renderConversationList(search){
  var list = document.getElementById('conversationItems');
  var query = (search || '').toLowerCase();
  list.innerHTML = '';
  conversations.filter(function(conversation){
    var name = String(conversation.name || '');
    var preview = String(conversation.preview || '');
    return !query || name.toLowerCase().indexOf(query) !== -1 || preview.toLowerCase().indexOf(query) !== -1;
  }).forEach(function(conversation){
    var item = document.createElement('button');
    item.type = 'button';
    item.dataset.conversationId = conversation.id;
    item.className = 'conversation-item' + (conversation.id === selectedConversationId ? ' active' : '');
    item.innerHTML = '<div class="conversation-avatar"></div>' +
      '<div class="conversation-copy"><div class="conversation-top"><span class="conversation-name"></span><span class="conversation-time"></span></div>' +
      '<span class="conversation-preview"></span></div>';
    item.querySelector('.conversation-avatar').textContent = getInitials(String(conversation.name || ''));
    item.querySelector('.conversation-name').textContent = conversation.name || conversation.email || 'Customer';
    item.querySelector('.conversation-time').textContent = conversation.time || '';
    item.querySelector('.conversation-preview').textContent = conversation.preview || '';
    item.addEventListener('click', function(event){
      event.preventDefault();
      openConversation(conversation);
    });
    list.appendChild(item);
  });
  document.getElementById('messageCount').textContent = conversations.length;
}
function openConversation(conversationOrId){
  var conversation = conversations.find(function(item){
    return typeof conversationOrId === 'object'
      ? item.id === conversationOrId.id
      : String(item.id) === String(conversationOrId);
  });
  if(!conversation){ return; }
  if(typeof BBMessages !== 'undefined' && conversation.email){
    conversation.messages = BBMessages.get(conversation.email);
  }
  selectedConversationId = conversation.id;
  document.getElementById('chatEmpty').hidden = true;
  document.getElementById('chatContent').hidden = false;
  document.getElementById('messenger').classList.add('chat-open');
  document.getElementById('chatAvatar').textContent = getInitials(String(conversation.name || 'Customer'));
  document.getElementById('chatName').textContent = conversation.name || conversation.email || 'Customer';
  renderConversationList(document.getElementById('conversationSearch').value);
  renderThread(conversation);
}
function renderThread(conversation){
  var messages = document.getElementById('chatMessages');
  messages.innerHTML = '<div class="message-date">Conversation with ' + conversation.name + '</div>';
  conversation.messages.forEach(function(message){
    var bubble = document.createElement('div');
    bubble.className = 'message-bubble ' + message.from;
    bubble.innerHTML = escapeMessageText(message.text) + '<span class="message-time">' + escapeMessageText(message.time) + '</span>';
    messages.appendChild(bubble);
  });
  messages.scrollTop = messages.scrollHeight;
}
function closeConversation(){
  document.getElementById('messenger').classList.remove('chat-open');
}
document.getElementById('conversationSearch').addEventListener('input', function(){ renderConversationList(this.value); });
document.getElementById('chatBack').addEventListener('click', closeConversation);
document.getElementById('chatComposer').addEventListener('submit', function(event){
  event.preventDefault();
  var input = document.getElementById('chatInput');
  var text = input.value.trim();
  var conversation = conversations.find(function(item){ return item.id === selectedConversationId; });
  if(!text || !conversation){ return; }
  if(conversation.email && typeof BBMessages !== 'undefined'){
    BBMessages.send(conversation.email, 'staff', text);
    conversation.messages = BBMessages.get(conversation.email);
  } else conversation.messages.push({from:'staff',text:text,time:'Just now'});
  conversation.preview = text;
  conversation.time = 'Just now';
  input.value = '';
  renderConversationList(document.getElementById('conversationSearch').value);
  renderThread(conversation);
});
syncCustomerConversations();
if(typeof BBMessages !== 'undefined') BBMessages.onChange(function(){ syncCustomerConversations(); renderConversationList(document.getElementById('conversationSearch').value); if(selectedConversationId){ var active = conversations.find(function(item){ return item.id === selectedConversationId; }); if(active) renderThread(active); } });
renderConversationList('');

var bookings = BBDatabase.walkIns(); /*
  {id:1,name:'Ana Villareal',room:'305',type:'Deluxe Twin',dates:'Sep 2 – Sep 4',pax:2},
  {id:2,name:'Noel Bautista',room:'203',type:'Garden Suite',dates:'Sep 1 – Sep 3',pax:3}
];
*/
var nextBookingId = bookings.reduce(function(max, booking){ return Math.max(max, Number(booking.id) || 0); }, 0) + 1;
function renderBookings(){
  var list = document.getElementById('bookingList');
  list.innerHTML = '';
  bookings.forEach(function(b){
    var initials = b.name.split(' ').map(function(n){ return n[0]; }).slice(0,2).join('');
    var row = document.createElement('div');
    row.className = 'booking-row';
    row.innerHTML =
      '<div class="booking-avatar">' + initials + '</div>' +
      '<div class="booking-info"><div class="n">' + b.name + '</div><div class="d">' + b.dates + ' · ' + b.pax + ' pax</div></div>' +
      '<div class="booking-room">Rm ' + b.room + '<span class="sub">' + b.type + '</span></div>' +
      '<button class="btn btn-outline btn-sm" style="margin-left:8px;" onclick="checkoutBooking(' + b.id + ')">Check out</button>';
    list.appendChild(row);
  });
  if(bookings.length === 0){ list.innerHTML = '<div class="card" style="text-align:center;color:var(--ink-faint);font-weight:600;font-size:13px;">No active walk-in bookings.</div>'; }
}
function showBookingNotice(message){
  var modal = document.getElementById('bookingNotice');
  document.getElementById('noticeMessage').textContent = message;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}
function closeBookingNotice(){
  var modal = document.getElementById('bookingNotice');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}
function openBookingForm(){
  var modal = document.getElementById('bookingModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  renderBookingRoomOptions();
  document.getElementById('bName').focus();
}
function closeBookingForm(){
  var modal = document.getElementById('bookingModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}
document.getElementById('bookingNotice').addEventListener('click', function(e){
  if(e.target === this){ closeBookingNotice(); }
});
document.getElementById('bookingModal').addEventListener('click', function(e){
  if(e.target === this){ closeBookingForm(); }
});
function checkoutBooking(id){
  var b = bookings.find(function(x){ return x.id === id; });
  if(!b){
    showToast('Booking could not be found');
    return;
  }
  if(confirm('Check out ' + b.name + ' from Room ' + b.room + '?')){
    bookings = bookings.filter(function(x){ return x.id !== id; });
    var room = rooms.find(function(x){ return x.no === b.room; });
    if(room){ room.status = 'available'; }
    BBDatabase.saveWalkIns(bookings);
    BBDatabase.saveRooms(rooms);
    renderRooms(currentRoomFilter);
    renderBookings();
    showToast(b.name + ' checked out');
  }
}
function submitBooking(e){
  e.preventDefault();
  var roomVal = document.getElementById('bRoom').value;
  var room = rooms.find(function(r){ return roomVal.indexOf(r.no + ' · ') === 0; });
  if(!room || room.status !== 'available'){
    showBookingNotice(room ? 'Room ' + room.no + ' is currently ' + room.status + ' and cannot be booked.' : 'Please select an available room.');
    return false;
  }
  var parts = roomVal.split(' · ');
  bookings.push({
    id: nextBookingId++,
    name: document.getElementById('bName').value,
    room: parts[0],
    type: parts[1] || '',
    dates: document.getElementById('bIn').value + ' – ' + document.getElementById('bOut').value,
    pax: Number(document.getElementById('bPax').value)
  });
  room.status = 'occupied';
  BBDatabase.saveWalkIns(bookings);
  BBDatabase.saveRooms(rooms);
  renderRooms(currentRoomFilter);
  renderBookings();
  e.target.reset();
  document.getElementById('bPax').value = 2;
  closeBookingForm();
  showToast('Walk-in booking added');
  return false;
}
renderBookings();

BBDatabase.onChange(function(data){
  checkReservationNotifications(data.reservations);
  rooms = data.rooms;
  reservations = data.reservations.map(function(r){
    r.guest = r.guest || r.userEmail || 'Guest';
    r.room = (r.roomType || '') + ' - ' + r.roomNo;
    r.dates = r.dates || ((r.checkin || '') + ' - ' + (r.checkout || ''));
    r.amount = typeof r.amount === 'number' ? 'PHP ' + r.amount.toLocaleString() : r.amount;
    return r;
  });
  bookings = data.walkIns;
  renderRooms(currentRoomFilter);
  renderReservations(currentResFilter);
  renderBookings();
});

var salesData = {
  day:   {total:'₱42,300', delta:'▲ 8.2% vs yesterday',  bookings:14, avg:'₱3,021', bars:[{l:'6a',v:10},{l:'9a',v:35},{l:'12p',v:60},{l:'3p',v:45},{l:'6p',v:80},{l:'9p',v:55},{l:'12a',v:20}]},
  week:  {total:'₱268,900', delta:'▲ 5.4% vs last week', bookings:81, avg:'₱3,319', bars:[{l:'Mon',v:40},{l:'Tue',v:55},{l:'Wed',v:48},{l:'Thu',v:70},{l:'Fri',v:90},{l:'Sat',v:100},{l:'Sun',v:60}]},
  month: {total:'₱1,142,000', delta:'▲ 12.1% vs last month', bookings:342, avg:'₱3,339', bars:[{l:'W1',v:60},{l:'W2',v:75},{l:'W3',v:55},{l:'W4',v:95}]},
  year:  {total:'₱13,820,000', delta:'▲ 18.9% vs last year', bookings:3987, avg:'₱3,467', bars:[{l:'Q1',v:55},{l:'Q2',v:70},{l:'Q3',v:90},{l:'Q4',v:100}]}
};
var currentSalesPeriod = 'day';
function renderSales(period){
  currentSalesPeriod = period;
  var d = salesData[period];
  document.getElementById('salesTotal').textContent = d.total;
  document.getElementById('salesDelta').textContent = d.delta;
  document.getElementById('salesBookings').textContent = d.bookings;
  document.getElementById('salesAvg').textContent = d.avg;
  var bars = document.getElementById('salesBars');
  bars.innerHTML = '';
  var max = Math.max.apply(null, d.bars.map(function(b){ return b.v; }));
  d.bars.forEach(function(b){
    var col = document.createElement('div');
    col.className = 'bar-col';
    var isHi = b.v === max;
    col.innerHTML = '<div class="bar' + (isHi ? ' hi' : '') + '" style="height:' + Math.max(6, (b.v/max)*100) + '%"></div><span class="lbl">' + b.l + '</span>';
    bars.appendChild(col);
  });
}

function renderHomeSalesAnalytics(){
  var data = salesData.week;
  var chart = document.getElementById('homeSalesChart');
  if(!chart){ return; }

  document.getElementById('homeSalesTotal').textContent = data.total;
  document.getElementById('homeSalesDelta').textContent = data.delta;
  document.getElementById('homeSalesBookings').textContent = data.bookings;

  var chartLeft = 14;
  var chartRight = 406;
  var chartTop = 12;
  var chartBottom = 132;
  var max = Math.max.apply(null, data.bars.map(function(bar){ return bar.v; }));
  var step = (chartRight - chartLeft) / (data.bars.length - 1);
  var points = data.bars.map(function(bar, index){
    var x = chartLeft + (index * step);
    var y = chartBottom - ((bar.v / max) * (chartBottom - chartTop));
    return {x:x, y:y, label:bar.l};
  });
  var linePoints = points.map(function(point){ return point.x + ',' + point.y; }).join(' ');
  var areaPoints = chartLeft + ',' + chartBottom + ' ' + linePoints + ' ' + chartRight + ',' + chartBottom;

  chart.innerHTML =
    '<line class="line-chart-grid" x1="14" y1="32" x2="406" y2="32"/>' +
    '<line class="line-chart-grid" x1="14" y1="82" x2="406" y2="82"/>' +
    '<line class="line-chart-grid" x1="14" y1="132" x2="406" y2="132"/>' +
    '<polygon class="line-chart-area" points="' + areaPoints + '"/>' +
    '<polyline class="line-chart-line" points="' + linePoints + '"/>' +
    points.map(function(point){
      return '<circle class="line-chart-dot" cx="' + point.x + '" cy="' + point.y + '" r="4"/>' +
        '<text class="line-chart-label" x="' + point.x + '" y="153" text-anchor="middle">' + point.label + '</text>';
    }).join('');
}

function renderSalesTrend(period){
  var data = salesData[period];
  var chart = document.getElementById('salesTrendChart');
  if(!chart){ return; }

  var periodLabels = {day:'Today', week:'This week', month:'This month', year:'This year'};
  document.getElementById('salesTrendPeriod').textContent = periodLabels[period] || period;
  document.getElementById('salesTrendTotal').textContent = data.total;
  document.getElementById('salesTrendDelta').textContent = data.delta;
  document.getElementById('salesTrendBookings').textContent = data.bookings;

  var chartLeft = 20;
  var chartRight = 800;
  var chartTop = 16;
  var chartBottom = 172;
  var max = Math.max.apply(null, data.bars.map(function(bar){ return bar.v; }));
  var step = data.bars.length === 1 ? 0 : (chartRight - chartLeft) / (data.bars.length - 1);
  var points = data.bars.map(function(bar, index){
    var x = chartLeft + (index * step);
    var y = chartBottom - ((bar.v / max) * (chartBottom - chartTop));
    return {x:x, y:y, label:bar.l};
  });
  var linePoints = points.map(function(point){ return point.x + ',' + point.y; }).join(' ');
  var areaPoints = chartLeft + ',' + chartBottom + ' ' + linePoints + ' ' + chartRight + ',' + chartBottom;

  chart.innerHTML =
    '<line class="line-chart-grid" x1="20" y1="52" x2="800" y2="52"/>' +
    '<line class="line-chart-grid" x1="20" y1="112" x2="800" y2="112"/>' +
    '<line class="line-chart-grid" x1="20" y1="172" x2="800" y2="172"/>' +
    '<polygon class="line-chart-area" points="' + areaPoints + '"/>' +
    '<polyline class="line-chart-line" points="' + linePoints + '"/>' +
    points.map(function(point){
      return '<circle class="line-chart-dot" cx="' + point.x + '" cy="' + point.y + '" r="5"/>' +
        '<text class="line-chart-label" x="' + point.x + '" y="198" text-anchor="middle">' + point.label + '</text>';
    }).join('');
}
renderSales('day');
renderHomeSalesAnalytics();
renderSalesTrend('day');
document.querySelectorAll('#salesTabs .pill').forEach(function(p){
  p.addEventListener('click', function(){
    document.querySelectorAll('#salesTabs .pill').forEach(function(x){ x.classList.remove('active'); });
    p.classList.add('active');
    renderSales(p.dataset.period);
    renderSalesTrend(p.dataset.period);
  });
});

function downloadReport(content, filename, type){
  var blob = new Blob([content], {type:type});
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
function generateSalesExcel(){
  var data = salesData[currentSalesPeriod];
  var rows = [
    ['Balay Bato Hotel - Sales Report'],
    ['Period', currentSalesPeriod],
    [],
    ['Metric', 'Value'],
    ['Total sales', data.total],
    ['Bookings', data.bookings],
    ['Average value', data.avg],
    [],
    ['Revenue breakdown', 'Value']
  ];
  data.bars.forEach(function(bar){ rows.push([bar.l, bar.v]); });
  var csv = rows.map(function(row){
    return row.map(function(value){ return '"' + String(value).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\r\n');
  downloadReport('\uFEFF' + csv, 'balay-bato-sales-' + currentSalesPeriod + '.csv', 'text/csv;charset=utf-8;');
  showToast('Excel sales report generated');
}
function generateSalesImage(){
  var data = salesData[currentSalesPeriod];
  var canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 720;
  var ctx = canvas.getContext('2d');
  var max = Math.max.apply(null, data.bars.map(function(bar){ return bar.v; }));
  ctx.fillStyle = '#EBEBEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(40, 40, 1120, 640);
  ctx.fillStyle = '#14171A';
  ctx.font = '800 34px Arial';
  ctx.fillText('Balay Bato Hotel - Sales Report', 80, 105);
  ctx.font = '500 22px Arial';
  ctx.fillStyle = '#62676B';
  ctx.fillText('Period: ' + currentSalesPeriod, 80, 145);
  ctx.fillStyle = '#14171A';
  ctx.font = '700 24px Arial';
  ctx.fillText('Total sales: ' + data.total, 80, 210);
  ctx.fillText('Bookings: ' + data.bookings, 430, 210);
  ctx.fillText('Average value: ' + data.avg, 700, 210);
  data.bars.forEach(function(bar, index){
    var x = 100 + index * (1000 / data.bars.length);
    var height = (bar.v / max) * 300;
    ctx.fillStyle = bar.v === max ? '#ED6C00' : '#FFF2E5';
    ctx.fillRect(x, 570 - height, 54, height);
    ctx.fillStyle = '#62676B';
    ctx.font = '600 18px Arial';
    ctx.fillText(bar.l, x + 12, 610);
  });
  canvas.toBlob(function(blob){
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'balay-bato-sales-' + currentSalesPeriod + '.png';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Image sales report generated');
  }, 'image/png');
}
document.getElementById('exportSalesExcel').addEventListener('click', generateSalesExcel);
document.getElementById('exportSalesImage').addEventListener('click', generateSalesImage);
