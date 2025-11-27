// Vulnerabilidades obvias para Semgrep

// 1. Hardcoded API key
const API_KEY = "sk-1234567890abcdef"; // Semgrep debería detectar esto

// 2. Hardcoded password  
const password = "admin123";

// 3. SQL Injection
function getUserById(id) {
    const query = `SELECT * FROM users WHERE id = ${id}`; // Vulnerable a SQL injection
    return db.query(query);
}

// 4. XSS vulnerability
function displayMessage(userInput) {
    document.getElementById("output").innerHTML = userInput; // XSS vulnerable
}

// 5. Eval usage (muy peligroso)
function executeUserCode(code) {
    eval(code); // Semgrep debería detectar esto definitivamente
}

// 6. Insecure randomness for crypto
function generateToken() {
    return Math.random().toString(36); // Inseguro para criptografía
}

// 7. Hardcoded JWT secret
const JWT_SECRET = "super-secret-key-123";

// 8. Command injection
function executeCommand(userInput) {
    const { exec } = require('child_process');
    exec(`ls ${userInput}`, (error, stdout, stderr) => { // Command injection
        console.log(stdout);
    });
}

// 9. Path traversal
function readFile(filename) {
    const fs = require('fs');
    return fs.readFileSync(`./uploads/${filename}`); // Path traversal vulnerable
}

// 10. Weak crypto
function weakHash(data) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(data).digest('hex'); // MD5 es débil
}

module.exports = {
    getUserById,
    displayMessage, 
    executeUserCode,
    generateToken,
    executeCommand,
    readFile,
    weakHash
};