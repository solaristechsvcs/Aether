import mysql from 'mysql2/promise';
import { config } from './config.js';
export const db = mysql.createPool({...config.database, multipleStatements: false, supportBigNumbers: true, bigNumberStrings: true});
