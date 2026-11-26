// Gera a linha de um usuário para a variável OFFICE_USERS do Render.
// Uso: node scripts/gerar-senha.mjs email@venustecnologia.com.br "Nome" "senha"
import {scryptSync, randomBytes} from 'node:crypto';
const [email, nome, senha] = process.argv.slice(2);
if (!email || !nome || !senha) {
  console.error('Uso: node scripts/gerar-senha.mjs <email> "<nome>" "<senha>"');
  process.exit(1);
}
if (senha.length < 10) { console.error('Use uma senha com pelo menos 10 caracteres.'); process.exit(1); }
const salt = randomBytes(16);
const hash = scryptSync(senha, salt, 32);
console.log(JSON.stringify({email: email.toLowerCase(), nome, hash: `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`}));
console.log('\nJunte as linhas dos três usuários num array: [ {...}, {...}, {...} ] e cole em OFFICE_USERS no Render.');
