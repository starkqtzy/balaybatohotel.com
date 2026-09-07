(function (window) {
  'use strict';

  var KEY = 'bb_hotel_database_v1';
  var LEGACY_RESERVATIONS = 'bb_reservations';
  var image = function (id) { return 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=700&q=75'; };

  var defaultRooms = [
    {id:1,no:'101',type:'Standard',floor:'1st Floor',rate:1800,cap:2,status:'available',amenities:['WiFi','A/C'],images:[image('1611892440504-42a792e24d32')]},
    {id:2,no:'102',type:'Standard',floor:'1st Floor',rate:1800,cap:2,status:'occupied',amenities:['WiFi','A/C'],images:[]},
    {id:3,no:'103',type:'Standard',floor:'1st Floor',rate:1800,cap:2,status:'occupied',amenities:['WiFi','A/C'],images:[]},
    {id:4,no:'104',type:'Deluxe Twin',floor:'1st Floor',rate:2800,cap:3,status:'maintenance',amenities:['WiFi','A/C','TV'],images:[]},
    {id:5,no:'110',type:'Family Room',floor:'1st Floor',rate:4200,cap:5,status:'occupied',amenities:['WiFi','A/C','Breakfast'],images:[image('1598928506311-c55ded91a20c')]},
    {id:6,no:'201',type:'Deluxe Twin',floor:'2nd Floor',rate:2800,cap:3,status:'occupied',amenities:['WiFi','A/C','TV'],images:[]},
    {id:7,no:'202',type:'Deluxe Twin',floor:'2nd Floor',rate:2800,cap:3,status:'available',amenities:['WiFi','A/C','TV'],images:[image('1590490360182-c33d57733427')]},
    {id:8,no:'203',type:'Garden Suite',floor:'2nd Floor',rate:3600,cap:4,status:'occupied',amenities:['WiFi','Balcony','Breakfast'],images:[]},
    {id:9,no:'204',type:'Garden Suite',floor:'2nd Floor',rate:3600,cap:4,status:'maintenance',amenities:['WiFi','Balcony','Breakfast'],images:[]},
    {id:10,no:'205',type:'Standard',floor:'2nd Floor',rate:1800,cap:2,status:'occupied',amenities:['WiFi','A/C'],images:[]},
    {id:11,no:'206',type:'Standard',floor:'2nd Floor',rate:1800,cap:2,status:'available',amenities:['WiFi','A/C'],images:[]},
    {id:12,no:'301',type:'Garden Suite',floor:'3rd Floor',rate:3600,cap:4,status:'occupied',amenities:['WiFi','Balcony','Breakfast'],images:[]},
    {id:13,no:'302',type:'Family Room',floor:'3rd Floor',rate:4200,cap:5,status:'occupied',amenities:['WiFi','A/C','Breakfast'],images:[]},
    {id:14,no:'303',type:'Deluxe Twin',floor:'3rd Floor',rate:2800,cap:3,status:'available',amenities:['WiFi','A/C','TV'],images:[image('1595576508898-0ad5c879a061')]},
    {id:15,no:'304',type:'Standard',floor:'3rd Floor',rate:1800,cap:2,status:'occupied',amenities:['WiFi','A/C'],images:[]},
    {id:16,no:'305',type:'Standard',floor:'3rd Floor',rate:1800,cap:2,status:'occupied',amenities:['WiFi','A/C'],images:[]},
    {id:17,no:'306',type:'Garden Suite',floor:'3rd Floor',rate:3600,cap:4,status:'available',amenities:['WiFi','Balcony','Breakfast'],images:[image('1584132967334-10e028bd69f7')]},
    {id:18,no:'307',type:'Deluxe Twin',floor:'3rd Floor',rate:2800,cap:3,status:'occupied',amenities:['WiFi','A/C','TV'],images:[]}
  ];

  var defaultReservations = [
    {id:1,userEmail:'michael@example.com',guest:'Michael Tan',roomNo:'306',roomType:'Garden Suite',checkin:'2026-09-05',checkout:'2026-09-07',guests:2,contact:'',wallet:'GCash',ref:'REF-8821-KM',proof:'',amount:7200,status:'pending'},
    {id:2,userEmail:'carla@example.com',guest:'Carla Dizon',roomNo:'202',roomType:'Deluxe Twin',checkin:'2026-09-06',checkout:'2026-09-08',guests:2,contact:'',wallet:'Maya',ref:'REF-9042-QP',proof:'',amount:5600,status:'pending'},
    {id:3,userEmail:'robert@example.com',guest:'Robert Cruz',roomNo:'101',roomType:'Standard',checkin:'2026-09-03',checkout:'2026-09-04',guests:1,contact:'',wallet:'GCash',ref:'REF-7710-LA',proof:'',amount:1800,status:'confirmed'},
    {id:4,userEmail:'ella@example.com',guest:'Ella Marasigan',roomNo:'110',roomType:'Family Room',checkin:'2026-08-29',checkout:'2026-08-31',guests:3,contact:'',wallet:'GoTyme',ref:'REF-6634-WD',proof:'',amount:8400,status:'rejected'}
  ];
  var defaultWalkIns = [
    {id:1,name:'Ana Villareal',room:'305',type:'Standard',dates:'2026-09-02 - 2026-09-04',pax:2,status:'active'},
    {id:2,name:'Noel Bautista',room:'203',type:'Garden Suite',dates:'2026-09-01 - 2026-09-03',pax:3,status:'active'}
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function read() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    var legacy = [];
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_RESERVATIONS) || '[]'); } catch (e2) {}
    var data = {version:1,rooms:clone(defaultRooms),users:[],reservations:clone(defaultReservations),walkIns:clone(defaultWalkIns),settings:{hotelName:'Balay Bato Hotel'}};
    legacy.forEach(function (r) { if (!data.reservations.some(function (x) { return x.id === r.id; })) data.reservations.push(r); });
    write(data);
    return data;
  }
  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); localStorage.setItem(LEGACY_RESERVATIONS, JSON.stringify(data.reservations)); } catch (e) {}
    return data;
  }
  function nextId(items) { return items.reduce(function (max, item) { return Math.max(max, Number(item.id) || 0); }, 0) + 1; }

  window.BBDatabase = {
    key: KEY,
    get: function () { return clone(read()); },
    rooms: function () { return clone(read().rooms); },
    saveRooms: function (rooms) { var data = read(); data.rooms = clone(rooms); write(data); return clone(data.rooms); },
    reservations: function () { return clone(read().reservations); },
    addReservation: function (reservation) { var data = read(); reservation.id = reservation.id || Date.now(); data.reservations.push(clone(reservation)); write(data); return clone(reservation); },
    updateReservation: function (id, changes) { var data = read(); var item = data.reservations.find(function (r) { return String(r.id) === String(id); }); if (item) Object.assign(item, changes); write(data); return item ? clone(item) : null; },
    users: function () { return clone(read().users); },
    saveUser: function (user) { var data = read(); var existing = data.users.find(function (u) { return u.email.toLowerCase() === user.email.toLowerCase(); }); if (existing) Object.assign(existing, user); else data.users.push(clone(user)); write(data); return clone(user); },
    walkIns: function () { return clone(read().walkIns); },
    saveWalkIns: function (walkIns) { var data = read(); data.walkIns = clone(walkIns); write(data); return clone(data.walkIns); },
    onChange: function (callback) { window.addEventListener('storage', function (event) { if (event.key === KEY) callback(BBDatabase.get()); }); }
  };
})(window);
