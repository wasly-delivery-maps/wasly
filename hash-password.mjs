import bcryptjs from 'bcryptjs';

const password = '157200aA@';
const hashedPassword = await bcryptjs.hash(password, 10);
console.log('Hashed password:', hashedPassword);
