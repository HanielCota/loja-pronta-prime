import { randomBytes } from 'node:crypto';
import { assertTestDatabase } from './support/cleanup';

/** The isolated database runner removes these accounts when the suite finishes. */
export default function setup() {
  assertTestDatabase();
  process.env.E2E_RUN_ID = randomBytes(8).toString('hex');
}
