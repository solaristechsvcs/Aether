const file = process.env.AETHER_CONFIG || './config.local.js';
export const config = (await import(new URL(file, import.meta.url))).default;
if (!/^[a-f0-9]{64}$/i.test(config.messageKey)) throw new Error('Set messageKey to a random 32-byte hex key in your private config file.');
if (new URL(config.origin).protocol === 'https:' && !config.secureCookies) throw new Error('HTTPS requires secureCookies.');
