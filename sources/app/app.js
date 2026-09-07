(function () {
  'use strict';

  var deferredPrompt = null;
  // Both admin pages are served from the site root, so keep the installer
  // path root-relative. Publish the real installer at this exact path.
  var DESKTOP_APP_URL = './downloads/balay-bato-admin-setup.exe';
  function isSupportedAppOrigin() {
    var localHost = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
    return window.location.protocol === 'https:' || localHost;
  }

  // Service workers and PWA installation require HTTPS, except for local
  // development origins such as http://localhost.
  if ('serviceWorker' in navigator && isSupportedAppOrigin()) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', {scope: './'}).catch(function (error) {
        console.warn('Admin app service worker registration failed:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
  });

  function isMobileDevice() {
    // Use the visible viewport instead of pointer type. Touch-enabled
    // laptops and desktop monitors should use the desktop control.
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function setStatus(message) {
    document.querySelectorAll('[data-install-status]').forEach(function (status) {
      status.textContent = message;
      status.style.display = 'block';
    });
  }

  function installCardStorageKey() {
    return 'install-card-dismissed:' + window.location.pathname;
  }

  function removeInstallCard() {
    try {
      window.localStorage.setItem(installCardStorageKey(), 'true');
    } catch (error) {
      // The card is still removed for this page if storage is unavailable.
    }
    document.querySelectorAll('.app-download-card, .app-install-card, .frontdesk-install-card').forEach(function (card) {
      card.remove();
    });
  }

  function restoreDismissedInstallCard() {
    try {
      if (window.localStorage.getItem(installCardStorageKey()) === 'true') {
        document.querySelectorAll('.app-download-card, .app-install-card, .frontdesk-install-card').forEach(function (card) {
          card.remove();
        });
      }
    } catch (error) {
      // Continue normally when local storage is unavailable.
    }
  }

  function installApp() {
    if (!deferredPrompt) {
      setStatus(isMobileDevice()
        ? 'Use your browser menu and choose “Add to Home Screen”.'
        : 'Use your browser menu and choose “Install app”.');
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') {
        removeInstallCard();
      } else {
        setStatus('Install dismissed.');
      }
      deferredPrompt = null;
    });
  }

  function downloadDesktopApp(button) {
    // A real EXE must be published by the deployment. Fetching it first lets
    // us detect a missing file and use the PWA installation fallback instead
    // of sending the administrator to a confusing 404 page.
    var installerUrl = button.getAttribute('data-desktop-app-url') || DESKTOP_APP_URL;
    fetch(installerUrl, {cache: 'no-store'}).then(function (response) {
      if (!response.ok) throw new Error('Installer not published');
      return response.blob();
    }).then(function (installer) {
      var downloadUrl = URL.createObjectURL(installer);
      var link = document.createElement('a');
      link.href = downloadUrl;
      link.download = button.getAttribute('data-desktop-app-filename') || 'balay-bato-admin-setup.exe';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () {
        URL.revokeObjectURL(downloadUrl);
      }, 60000);
      setStatus('Desktop installer download started.');
      removeInstallCard();
    }).catch(function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice.outcome === 'accepted') {
            removeInstallCard();
          } else {
            setStatus('Installation dismissed.');
          }
          deferredPrompt = null;
        });
      } else {
        setStatus('The Windows installer is not published yet. Use your browser menu and choose “Install app”.');
      }
    });
  }

  function updateInstallControls() {
    var mobile = isMobileDevice();
    document.querySelectorAll('[data-mobile-install]').forEach(function (element) {
      element.hidden = !mobile;
    });
    document.querySelectorAll('[data-windows-install]').forEach(function (element) {
      // Keep both install options available on mobile; the buttons are laid
      // out side by side by the mobile install-card styles.
      element.hidden = false;
    });
    document.querySelectorAll('[data-pwa-install]').forEach(function (element) {
      element.hidden = false;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    restoreDismissedInstallCard();
    updateInstallControls();
    window.addEventListener('resize', updateInstallControls);
    document.querySelectorAll('[data-mobile-install]').forEach(function (button) {
      button.addEventListener('click', installApp);
    });
    document.querySelectorAll('[data-pwa-install]').forEach(function (button) {
      button.addEventListener('click', installApp);
    });
    document.querySelectorAll('[data-windows-install]').forEach(function (button) {
      button.addEventListener('click', function () {
        downloadDesktopApp(button);
      });
    });
  });
}());
