/* Root service-worker entry point.
 * The browser only allows a worker to control the directory where its script
 * lives, so this file must remain at the site root. The implementation lives
 * in sources/app/sw.js to keep the app assets together.
 */
importScripts('sources/app/sw.js');
