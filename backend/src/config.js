import 'dotenv/config';

// Blank counts as missing: `DATABASE_URL=` in a .env file is a mistake, not a value.
const read = (name) => {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? undefined : value;
};

export const config = {
  port: Number(read('PORT') ?? 3000),
  databaseUrl: read('DATABASE_URL'),
  jwtSecret: read('JWT_SECRET'),
  jwtExpiresIn: read('JWT_EXPIRES_IN') ?? '12h',
  bcryptRounds: Number(read('BCRYPT_ROUNDS') ?? 10),
};

/**
 * Every problem with the required settings, by variable NAME only.
 * Never put a value in these messages: DATABASE_URL holds the password, JWT_SECRET is a secret.
 */
export function checkConfig(env = process.env) {
  const get = (name) => (env[name] === undefined || env[name].trim() === '' ? undefined : env[name]);
  const problems = [];

  for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!get(name)) problems.push(`${name} is missing`);
  }
  const url = get('DATABASE_URL');
  if (url && !/^postgres(ql)?:\/\//.test(url)) {
    problems.push('DATABASE_URL must start with postgres:// or postgresql://');
  }
  const secret = get('JWT_SECRET');
  if (secret && secret.length < 32) problems.push('JWT_SECRET must be at least 32 characters');

  const port = get('PORT');
  if (port !== undefined && !(Number.isInteger(Number(port)) && Number(port) > 0 && Number(port) < 65536)) {
    problems.push('PORT must be a whole number between 1 and 65535');
  }
  for (const name of ['BCRYPT_ROUNDS']) {
    const v = get(name);
    if (v !== undefined && !(Number.isInteger(Number(v)) && Number(v) >= 4 && Number(v) <= 15)) {
      problems.push(`${name} must be a whole number between 4 and 15`);
    }
  }
  return problems;
}

/** Runs before the server listens (and before any script touches the database). Refuses to start. */
export function assertConfig() {
  const problems = checkConfig();
  if (problems.length === 0) return;
  for (const p of problems) console.error(`startup check failed: ${p}`);
  console.error('Not starting. Set the variable(s) above (see .env.example) and start again.');
  process.exit(1);
}
