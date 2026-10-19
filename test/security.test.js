import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { passwordHash,passwordMatches,seal,unseal,hashToken } from '../security.js';
test('passwords use independent salts and reject wrong passwords',async()=>{const a=await passwordHash('a secure password');const b=await passwordHash('a secure password');assert.notEqual(a,b);assert.equal(await passwordMatches('a secure password',a),true);assert.equal(await passwordMatches('incorrect password',a),false);});
test('message encryption authenticates ciphertext and uses unique nonces',()=>{const key=randomBytes(32).toString('hex');const a=seal('private content',key),b=seal('private content',key);assert.notEqual(a,b);assert.equal(unseal(a,key),'private content');assert.throws(()=>unseal(a,randomBytes(32).toString('hex')));const parts=a.split('.');parts[2]=Buffer.from('tampered').toString('base64');assert.throws(()=>unseal(parts.join('.'),key));});
test('session tokens are hashed deterministically',()=>{assert.equal(hashToken('token').length,64);assert.equal(hashToken('token'),hashToken('token'));assert.notEqual(hashToken('token'),hashToken('other'));});
