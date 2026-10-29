import bcrypt from 'bcryptjs';
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: node src/make-password-hash.js "a-long-password-at-least-12-chars"');
  process.exit(1);
}
console.log(await bcrypt.hash(password, 12));
