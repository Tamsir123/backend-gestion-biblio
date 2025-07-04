// Vérifier que fetch est disponible dans Node.js 18+
if (typeof fetch === 'undefined') {
  console.log('⚠️  fetch non disponible - installation de node-fetch');
  process.exit(1);
} else {
  console.log('✅ fetch disponible dans Node.js');
}
