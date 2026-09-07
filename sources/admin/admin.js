function setActiveNav(view){
  document.querySelectorAll('.nav-item, .side-item').forEach(function(el){
    el.classList.toggle('active', el.dataset.view === view);
  });
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
    showToast('Profile: Administrator');
  });
  document.addEventListener('click', function(event){
    if(!event.target.closest('.profile-wrap')) closeProfileMenu();
  });
}

function doLogout(){
  sessionStorage.removeItem('bb_admin_authenticated');
  window.location.href = 'admin_login.html';
}

var toastTimer;
function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2400);
}
function saveForm(e, msg){
  e.preventDefault();
  showToast(msg);
  return false;
}

(function(){
  var h = new Date().getHours();
  var g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('mobileGreet').textContent = g;
})();

var rooms = BBDatabase.rooms();
var nextRoomId = rooms.reduce(function(max, room){ return Math.max(max, Number(room.id) || 0); }, 0) + 1;
var pendingImages = [];
var selectedAmenities = [];

document.querySelectorAll('#amenityGrid .amenity-chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    var amenity = chip.dataset.a;
    chip.classList.toggle('on');
    if(selectedAmenities.indexOf(amenity) === -1){ selectedAmenities.push(amenity); }
    else { selectedAmenities = selectedAmenities.filter(function(item){ return item !== amenity; }); }
  });
});

function escapeHtml(value){
  return String(value == null ? '' : value).replace(/[&<>'"]/g, function(char){
    return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];
  });
}

function handleImages(event){
  Array.from(event.target.files || []).forEach(function(file){
    var reader = new FileReader();
    reader.onload = function(loadEvent){
      pendingImages.push(loadEvent.target.result);
      renderImgUpload();
    };
    reader.readAsDataURL(file);
  });
}

function renderImgUpload(){
  var upload = document.getElementById('imgUpload');
  upload.innerHTML = '';
  pendingImages.forEach(function(src){
    var image = document.createElement('img');
    image.className = 'img-thumb';
    image.src = src;
    image.alt = 'Room preview';
    upload.appendChild(image);
  });
  var addLabel = document.createElement('label');
  addLabel.className = 'img-add';
  addLabel.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg><input type="file" accept="image/*" multiple style="display:none" onchange="handleImages(event)">';
  upload.appendChild(addLabel);
}

function openRoomForm(room){
  var modal = document.getElementById('roomModal');
  var title = document.getElementById('roomFormTitle');
  pendingImages = room && room.images ? room.images.slice() : [];
  selectedAmenities = room && room.amenities ? room.amenities.slice() : [];
  document.getElementById('roomForm').reset();
  document.getElementById('fRoomId').value = room ? room.id : '';
  document.getElementById('fRoomNo').value = room ? room.no : '';
  document.getElementById('fRoomType').value = room ? room.type : '';
  document.getElementById('fRate').value = room ? room.rate : '';
  document.getElementById('fCap').value = room ? room.cap : '';
  document.querySelectorAll('#amenityGrid .amenity-chip').forEach(function(chip){
    chip.classList.toggle('on', selectedAmenities.indexOf(chip.dataset.a) !== -1);
  });
  title.lastChild.textContent = room ? 'Edit room' : 'New room';
  renderImgUpload();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  document.getElementById('fRoomNo').focus();
}

function closeRoomForm(){
  document.getElementById('roomModal').classList.remove('open');
  document.getElementById('roomModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  document.getElementById('roomForm').reset();
  pendingImages = [];
  selectedAmenities = [];
}

document.getElementById('roomModal').addEventListener('click', function(event){
  if(event.target === this){ closeRoomForm(); }
});
document.addEventListener('keydown', function(event){
  if(event.key === 'Escape' && document.getElementById('roomModal').classList.contains('open')){
    closeRoomForm();
  }
});

function submitRoomForm(event){
  event.preventDefault();
  var id = document.getElementById('fRoomId').value;
  var roomData = {
    no: document.getElementById('fRoomNo').value.trim(),
    type: document.getElementById('fRoomType').value,
    floor: 'New floor',
    rate: Number(document.getElementById('fRate').value),
    cap: Number(document.getElementById('fCap').value),
    amenities: selectedAmenities.slice(),
    images: pendingImages.slice()
  };
  if(id){
    var index = rooms.findIndex(function(room){ return String(room.id) === String(id); });
    if(index !== -1){
      roomData.status = rooms[index].status;
      roomData.floor = rooms[index].floor || roomData.floor;
      rooms[index] = Object.assign(rooms[index], roomData);
    }
    showToast('Room ' + roomData.no + ' updated');
  } else {
    roomData.id = nextRoomId++;
    roomData.status = 'available';
    rooms.push(roomData);
    showToast('Room ' + roomData.no + ' added');
  }
  BBDatabase.saveRooms(rooms);
  closeRoomForm();
  renderRooms(currentRoomFilter);
  return false;
}

function deleteRoom(id){
  var room = rooms.find(function(item){ return item.id === id; });
  if(room && confirm('Delete Room ' + room.no + '? This cannot be undone.')){
    rooms = rooms.filter(function(item){ return item.id !== id; });
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
    var image = r.images && r.images[0] ? '<img class="room-thumb" src="' + r.images[0] + '" alt="Room ' + escapeHtml(r.no) + '">' : '<div class="room-thumb"></div>';
    var chips = (r.amenities || []).slice(0, 3).map(function(amenity){ return '<span class="mini-chip">' + escapeHtml(amenity) + '</span>'; }).join('');
    card.innerHTML =
      image +
      '<div class="room-body">' +
      '<div class="rtop">' +
        '<div><div class="rno">' + escapeHtml(r.no) + '</div><div class="rtype">' + escapeHtml(r.type) + '</div></div>' +
        '<div class="rrate">&#8369;' + Number(r.rate || 0).toLocaleString() + '</div>' +
      '</div>' +
      '<div class="rcap">' + Number(r.cap || 0) + ' pax capacity</div>' +
      '<div class="chip-row">' + chips + '</div>' +
      '<div class="room-actions"><button class="btn btn-outline btn-sm" type="button" onclick="openRoomForm(rooms.find(function(x){return x.id===' + r.id + '}))">Edit</button>' +
      '<button class="btn btn-danger btn-sm" type="button" onclick="deleteRoom(' + r.id + ')">Delete</button></div>' +
      '</div>';
    grid.appendChild(card);
  });
}
renderRooms('all');
document.querySelectorAll('#roomFilters .pill').forEach(function(p){
  p.addEventListener('click', function(){
    document.querySelectorAll('#roomFilters .pill').forEach(function(x){ x.classList.remove('active'); });
    p.classList.add('active');
    renderRooms(p.dataset.status);
  });
});

BBDatabase.onChange(function(data){
  rooms = data.rooms;
  renderRooms(document.querySelector('#roomFilters .pill.active') ? document.querySelector('#roomFilters .pill.active').dataset.status : 'all');
});

var salesData = {
  day:   {total:'₱42,300', delta:'▲ 8.2% vs yesterday',  bookings:14, avg:'₱3,021', bars:[{l:'6a',v:10},{l:'9a',v:35},{l:'12p',v:60},{l:'3p',v:45},{l:'6p',v:80},{l:'9p',v:55},{l:'12a',v:20}]},
  week:  {total:'₱268,900', delta:'▲ 5.4% vs last week', bookings:81, avg:'₱3,319', bars:[{l:'Mon',v:40},{l:'Tue',v:55},{l:'Wed',v:48},{l:'Thu',v:70},{l:'Fri',v:90},{l:'Sat',v:100},{l:'Sun',v:60}]},
  month: {total:'₱1,142,000', delta:'▲ 12.1% vs last month', bookings:342, avg:'₱3,339', bars:[{l:'W1',v:60},{l:'W2',v:75},{l:'W3',v:55},{l:'W4',v:95}]},
  year:  {total:'₱13,820,000', delta:'▲ 18.9% vs last year', bookings:3987, avg:'₱3,467', bars:[{l:'Q1',v:55},{l:'Q2',v:70},{l:'Q3',v:90},{l:'Q4',v:100}]}
};
function renderSales(period){
  var d = salesData[period];
  document.getElementById('salesTotal').textContent = d.total;
  document.getElementById('salesDelta').textContent = d.delta;
  document.getElementById('salesBookings').textContent = d.bookings;
  document.getElementById('salesAvg').textContent = d.avg;
  renderSalesTrend(period);
}
function renderSalesTrend(period){
  var data = salesData[period];
  var chart = document.getElementById('salesTrendChart');
  if(!chart){ return; }
  var labels = {day:'Today', week:'This week', month:'This month', year:'This year'};
  document.getElementById('salesTrendPeriod').textContent = labels[period] || period;
  document.getElementById('salesTrendTotal').textContent = data.total;
  document.getElementById('salesTrendDelta').textContent = data.delta;
  document.getElementById('salesTrendBookings').textContent = data.bookings;
  var left = 20, right = 800, top = 16, bottom = 172;
  var max = Math.max.apply(null, data.bars.map(function(bar){ return bar.v; }));
  var step = data.bars.length === 1 ? 0 : (right - left) / (data.bars.length - 1);
  var points = data.bars.map(function(bar, index){
    return {x:left + (index * step), y:bottom - ((bar.v / max) * (bottom - top)), label:bar.l};
  });
  var linePoints = points.map(function(point){ return point.x + ',' + point.y; }).join(' ');
  var areaPoints = left + ',' + bottom + ' ' + linePoints + ' ' + right + ',' + bottom;
  chart.innerHTML =
    '<line class="line-chart-grid" x1="20" y1="172" x2="800" y2="172"/>' +
    '<polygon class="line-chart-area" points="' + areaPoints + '"/>' +
    '<polyline class="line-chart-line" points="' + linePoints + '"/>' +
    points.map(function(point){
      return '<circle class="line-chart-dot" cx="' + point.x + '" cy="' + point.y + '" r="5"/>' +
        '<text class="line-chart-label" x="' + point.x + '" y="198" text-anchor="middle">' + point.label + '</text>';
    }).join('');
}
renderSales('day');
document.querySelectorAll('#salesTabs .pill').forEach(function(p){
  p.addEventListener('click', function(){
    document.querySelectorAll('#salesTabs .pill').forEach(function(x){ x.classList.remove('active'); });
    p.classList.add('active');
    renderSales(p.dataset.period);
  });
});

/* Legacy install code retained below for compatibility; the shared app.js
   now owns manifest installation and download controls.
var manifestObj = {
  name: "Balay Bato Hotel — Admin",
  short_name: "BB Admin",
  start_url: "./admin.html",
  display: "standalone",
  background_color: "#FFFFFF",
  theme_color: "#000000",
  description: "Admin-only app for managing Balay Bato Hotel rooms, sales and settings.",
  icons: []
};
(function attachManifest(){
  var blob = new Blob([JSON.stringify(manifestObj, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var link = document.createElement('link');
  link.rel = 'manifest';
  link.href = url;
  document.head.appendChild(link);
})();

var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault();
  deferredPrompt = e;
});
function installApp(){
  var status = document.getElementById('installStatus');
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(choice){
      status.style.display = 'block';
      status.textContent = choice.outcome === 'accepted' ? 'App installed on this device.' : 'Install dismissed.';
      deferredPrompt = null;
    });
  } else {
    status.style.display = 'block';
    status.textContent = 'Use your browser\'s "Install app" or "Add to Home Screen" option to install.';
  }
}
function downloadWindowsShortcut(){
  var shortcutUrl = window.location.href;
  var shortcut = '[InternetShortcut]\r\nURL=' + shortcutUrl + '\r\n';
  var blob = new Blob([shortcut], {type:'application/internet-shortcut'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'balay-bato-admin.url';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  showToast('Windows shortcut downloaded');
}

*/
document.querySelectorAll('[data-toast]').forEach(function(button){
  button.addEventListener('click', function(){ showToast(button.dataset.toast); });
});
document.querySelectorAll('form[data-success-message]').forEach(function(form){
  form.addEventListener('submit', function(event){ saveForm(event, form.dataset.successMessage); });
});
