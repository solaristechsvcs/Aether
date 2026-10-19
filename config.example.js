// Copy to config.local.js. Never commit real credentials or encryption keys.
export default {
  host: '127.0.0.1', port: 3000, origin: 'http://localhost:3000',
  secureCookies: false, registrationOpen: true,
  database: { host: '127.0.0.1', port: 3306, user: 'aether_dev', password: '', database: 'aether_dev', connectionLimit: 10 },
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  messageKey: 'REPLACE_WITH_64_HEX_CHARACTERS'
};
