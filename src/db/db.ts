import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getConfig } from "../config.js";
import { initSchema } from "./schema.js";

let db : Database.Database | null = null;

export function getDB(): Database.Database {
    if (db) return db;

    const config = getConfig();
    fs.mkdirSync(path.dirname(config.databasePath), {recursive : true });

    db = new Database(config.databasePath);
    db.pragma("foreign_keys = ON");
    initSchema(db);

    return db;
}

export function closeDbForTests() {
    if (db) {
        db.close();
        db = null;
    }
}