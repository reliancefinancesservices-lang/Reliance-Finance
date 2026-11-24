const bcrypt=require('bcryptjs');
const password=process.argv[2];
if(!password || password.length<12){console.error('Usage: node scripts/hash-password.js "A-strong-password" (minimum 12 characters)');process.exit(1)}
bcrypt.hash(password,12).then(hash=>console.log(hash));
