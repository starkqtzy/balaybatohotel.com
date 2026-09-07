(function () {
  'use strict';

  var VALID_USERNAME = 'admin';
  var VALID_PASSWORD = 'admin123';
  var form = document.getElementById('adminLoginForm');
  var username = document.getElementById('username');
  var password = document.getElementById('password');
  var showPassword = document.getElementById('showPassword');
  var message = document.getElementById('loginMessage');

  showPassword.addEventListener('click', function () {
    var isVisible = password.type === 'text';
    password.type = isVisible ? 'password' : 'text';
    showPassword.textContent = isVisible ? 'Show' : 'Hide';
    showPassword.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    message.textContent = '';

    if (!username.value.trim() || !password.value) {
      message.textContent = 'Please enter your username and password.';
      return;
    }

    if (username.value.trim() === VALID_USERNAME && password.value === VALID_PASSWORD) {
      sessionStorage.setItem('bb_admin_authenticated', 'true');
      window.location.replace(new URL('admin.html', document.baseURI).href);
      return;
    }

    message.textContent = 'Incorrect username or password.';
    password.select();
  });
})();
