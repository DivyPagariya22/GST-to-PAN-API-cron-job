import dotenv from "dotenv";
import pgPromise from "pg-promise";
dotenv.config();
const pgp = pgPromise();

export const fos_db = pgp(process.env.FOS_DATABASE_URL);
export const db = pgp(process.env.DATABASE_URL);
