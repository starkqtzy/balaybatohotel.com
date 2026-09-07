/* ---------------- Toast ---------------- */
var toastTimer;
function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2400);
}

/* ---------------- Mobile intro slides ---------------- */
var slides = [
  {
    title:'Every stay, from booking to check-out, in one place.',
    sub:'Browse rooms, see real-time availability, and compare rates in seconds.',
    image:'images/L1.jpg',
    badge:'Available', miniTitle:'24 rooms', miniSub:'Updated in real time',
    icon:'<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>'
  },
  {
    title:'Pay safely with your favorite e-wallet.',
    sub:'Reserve online and confirm with GCash, Maya, or GoTyme - no cash needed.',
    image:'images/L2.jpg',
    badge:'Pending', miniTitle:'Reference number', miniSub:'Upload as proof of payment',
    icon:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  },
  {
    title:'Track your reservation, every step of the way.',
    sub:'Know the moment the front desk verifies your payment.',
    image:'images/L3.jpg',
    badge:'Approved', miniTitle:'Reservation status', miniSub:'Verified by front desk',
    icon:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  }
];
var savedSlide = 0;
try { savedSlide = Number(sessionStorage.getItem('bb_login_slide')) || 0; } catch(e) {}
var currentSlide = Math.min(savedSlide, slides.length - 1);
function renderSlide(){
  var s = slides[currentSlide];
  try { sessionStorage.setItem('bb_login_slide', String(currentSlide)); } catch(e) {}
  var brandPanel = document.getElementById('brandPanel');
  brandPanel.classList.toggle('slide-1', currentSlide === 0);
  brandPanel.classList.toggle('slide-2', currentSlide === 1);
  brandPanel.classList.toggle('slide-3', currentSlide === 2);
  document.querySelector('.fc-main .fc-img img').src = s.image;
  document.getElementById('slideTitle').textContent = s.title;
  document.getElementById('slideSub').textContent = s.sub;
  ['slideDashes','introDots'].forEach(function(id){
    var dots = document.getElementById(id).querySelectorAll('span');
    dots.forEach(function(d, i){ d.classList.toggle('on', i === currentSlide); });
  });
  document.getElementById('introNextBtn').innerHTML = currentSlide === slides.length - 1
    ? 'Get started<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
    : 'Next<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
}
function hasReturnTarget(){ return !!new URLSearchParams(window.location.search).get('redirect'); }
function resetIntroState(){
  try { sessionStorage.removeItem('bb_login_slide'); } catch(e) {}
}
function goToLogin(){
  document.querySelector('.login-page').classList.add('show-form');
  if(!window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search + '#form');
}
function nextSlide(){
  if(currentSlide < slides.length - 1){ currentSlide++; renderSlide(); }
  else { goToLogin(); }
}
function skipIntro(){ goToLogin(); }
function backToIntro(){
  if(hasReturnTarget()){
    resetIntroState();
    window.location.href = getRedirectTarget();
    return;
  }
  document.querySelector('.login-page').classList.remove('show-form');
  history.replaceState(null, '', window.location.pathname + window.location.search);
  currentSlide = 0;
  renderSlide();
  if(typeof setAuthMode === 'function') setAuthMode(false);
}
var isMobile = window.matchMedia('(max-width:900px)');
var desktopSlideTimer = null;

function startDesktopSlideShow(){
  if(desktopSlideTimer || isMobile.matches) return;

  renderSlide();
  desktopSlideTimer = setInterval(function(){
    if(isMobile.matches) return;
    var brandPanel = document.getElementById('brandPanel');
    brandPanel.classList.add('slide-changing');

    setTimeout(function(){
      if(isMobile.matches){
        brandPanel.classList.remove('slide-changing');
        return;
      }

      currentSlide = (currentSlide + 1) % slides.length;
      renderSlide();
      requestAnimationFrame(function(){
        brandPanel.classList.remove('slide-changing');
      });
    }, 220);
  }, 3000);
}

function stopDesktopSlideShow(){
  if(!desktopSlideTimer) return;
  clearInterval(desktopSlideTimer);
  desktopSlideTimer = null;
}

if(isMobile.matches){
  renderSlide();
} else {
  startDesktopSlideShow();
}

var shouldShowForm = new URLSearchParams(window.location.search).get('mode') === 'signup' || window.location.hash === '#form';
if(shouldShowForm) document.querySelector('.login-page').classList.add('show-form');
requestAnimationFrame(function(){ document.querySelector('.login-page').classList.add('page-ready'); });

isMobile.addEventListener('change', function(e){
  if(e.matches){
    stopDesktopSlideShow();
    currentSlide = 0;
    renderSlide();
  } else {
    startDesktopSlideShow();
  }
});

/* swipe support for the intro (mobile only) */
var touchStartX = null;
var brandPanelEl = document.getElementById('brandPanel');
brandPanelEl.addEventListener('touchstart', function(e){
  if(!window.matchMedia('(max-width:900px)').matches) return;
  touchStartX = e.changedTouches[0].clientX;
});
brandPanelEl.addEventListener('touchend', function(e){
  if(touchStartX === null || !window.matchMedia('(max-width:900px)').matches) return;
  var dx = e.changedTouches[0].clientX - touchStartX;
  if(dx < -40){ nextSlide(); }
  else if(dx > 40 && currentSlide > 0){ currentSlide--; renderSlide(); }
  touchStartX = null;
});

/* ---------------- Role selector ---------------- */
var selectedRole = 'guest';
var roleCopy = {
  guest: {sub:'Log in to browse rooms, reserve, and track your stay.', dest:'index.html', showSignup:true},
  frontdesk: {sub:'Log in to manage rooms, reservations, and bookings.', dest:'frontdesk.html', showSignup:false},
  admin: {sub:'Log in to view sales, rooms, and manage your team.', dest:'admin.html', showSignup:false}
};
document.querySelectorAll('#roleRow .role-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('#roleRow .role-btn').forEach(function(x){ x.classList.remove('active'); });
    btn.classList.add('active');
    selectedRole = btn.dataset.role;
    var info = roleCopy[selectedRole];
    document.getElementById('formSub').textContent = info.sub;
    document.getElementById('switchLine').style.display = info.showSignup ? 'block' : 'none';
  });
});

/* ---------------- Login ---------------- */
function handleLogin(e){
  e.preventDefault();

  var email = document.getElementById('email').value.trim().toLowerCase();
  var password = document.getElementById('password').value;
  var redirect = getRedirectTarget();

  if(isSignupMode){
    if(password !== confirmPassword.value){
      showToast('Passwords do not match');
      return false;
    }
    var newUser = {name: fullName.value.trim(), email: email, password: password};
    BBDatabase.saveUser(newUser);
    saveSession(newUser);
    showToast('Account created successfully');
    setTimeout(function(){ window.location.href = redirect; }, 500);
    return false;
  }

  var existingUser = BBDatabase.users().find(function(user){ return String(user.email).toLowerCase() === email; });
  if(existingUser && existingUser.password && existingUser.password !== password){
    showToast('Incorrect email or password');
    return false;
  }
  var user = existingUser || {name: email.split('@')[0].replace(/[._-]/g, ' '), email: email};
  saveSession(user);
  showToast('Welcome back, ' + user.name.split(/\s+/)[0] + '!');
  setTimeout(function(){ window.location.href = redirect; }, 500);
  return false;
}
function socialLogin(provider){
  var user = {name: provider + ' User', email: provider.toLowerCase() + 'user@example.com'};
  BBDatabase.saveUser(user);
  saveSession(user);
  showToast('Signing in with ' + provider + '...');
  setTimeout(function(){ window.location.href = getRedirectTarget(); }, 500);
}

function saveSession(user){
  try { localStorage.setItem('bb_user', JSON.stringify(user)); } catch(e) {}
}
function getRedirectTarget(){
  var requested = new URLSearchParams(window.location.search).get('redirect');
  if(!requested) return 'index.html';
  // Only allow local page redirects; never turn the login form into an open redirect.
  if(requested.indexOf('://') !== -1 || requested.indexOf('\\') !== -1 || requested.charAt(0) === '/') return 'index.html';
  return requested;
}

var isSignupMode = false;
var formWrap = document.querySelector('.form-wrap');
var formTitle = document.getElementById('formTitle');
var formSub = document.getElementById('formSub');
var authSubmitBtn = document.getElementById('authSubmitBtn');
var signupLink = document.getElementById('signupLink');
var fullName = document.getElementById('fullName');
var confirmPassword = document.getElementById('confirmPassword');
var password = document.getElementById('password');
var passwordMatchMessage = document.getElementById('passwordMatchMessage');

function updatePasswordMatch(){
  var confirmation = confirmPassword.value;
  password.classList.remove('password-mismatch', 'password-match');
  confirmPassword.classList.remove('password-mismatch', 'password-match');
  passwordMatchMessage.classList.remove('mismatch', 'match');
  passwordMatchMessage.textContent = '';

  if(!confirmation) return;
  if(password.value !== confirmation){
    password.classList.add('password-mismatch');
    confirmPassword.classList.add('password-mismatch');
    passwordMatchMessage.classList.add('mismatch');
    passwordMatchMessage.textContent = 'Password was not match';
  } else {
    password.classList.add('password-match');
    confirmPassword.classList.add('password-match');
    passwordMatchMessage.classList.add('match');
    passwordMatchMessage.textContent = 'Good, password is match';
  }
}

function setAuthMode(signup){
  isSignupMode = signup;
  formWrap.classList.toggle('signup-mode', signup);
  formTitle.textContent = signup ? 'Create your account' : 'Hello again!';
  formSub.textContent = signup
    ? 'Sign up to reserve rooms and manage your stay.'
    : 'Log in to browse rooms, reserve, and track your stay.';
  authSubmitBtn.textContent = signup ? 'Create account' : 'Log in';
  signupLink.textContent = signup ? 'Log in' : 'Sign up';
  document.getElementById('switchLine').firstChild.textContent = signup
    ? 'Already have an account? '
    : "Don't have an account? ";
  fullName.disabled = !signup;
  confirmPassword.disabled = !signup;
  fullName.required = signup;
  confirmPassword.required = signup;
  if(!signup){
    document.getElementById('showPassword').checked = false;
    document.getElementById('password').type = 'password';
    confirmPassword.type = 'password';
  }
}

signupLink.addEventListener('click', function(e){
  e.preventDefault();
  setAuthMode(!isSignupMode);
});

document.getElementById('introSkipBtn').addEventListener('click', skipIntro);
document.getElementById('introNextBtn').addEventListener('click', nextSlide);
document.getElementById('backIntroBtn').addEventListener('click', backToIntro);
document.getElementById('loginForm').addEventListener('submit', handleLogin);
password.addEventListener('input', updatePasswordMatch);
confirmPassword.addEventListener('input', updatePasswordMatch);
document.getElementById('showPassword').addEventListener('change', function(){
  var inputType = this.checked ? 'text' : 'password';
  document.getElementById('password').type = inputType;
  confirmPassword.type = inputType;
});
document.getElementById('forgotPasswordLink').addEventListener('click', function(e){
  e.preventDefault();
  showToast('Password reset link sent (demo)');
});
document.getElementById('googleLoginBtn').addEventListener('click', function(){ socialLogin('Google'); });
document.getElementById('facebookLoginBtn').addEventListener('click', function(){ socialLogin('Facebook'); });

var requestedMode = new URLSearchParams(window.location.search).get('mode');
if(requestedMode === 'signup') setAuthMode(true);
