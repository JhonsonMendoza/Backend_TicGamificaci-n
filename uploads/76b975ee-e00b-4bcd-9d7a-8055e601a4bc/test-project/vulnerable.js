// VULNERABILIDADES CRÍTICAS DE SEGURIDAD

// 1. Hardcoded secrets - CRITICAL
const API_KEY = "sk-1234567890abcdef";
const SECRET_KEY = "MySecretKey123!";
const PASSWORD = "admin123";
const JWT_SECRET = "jwt-secret-key-2024";

// 2. SQL Injection - CRITICAL  
function login(username, password) {
    const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
    return database.execute(query); // Direct SQL injection
}

// 3. XSS Vulnerability - HIGH
function showUserContent(input) {
    document.body.innerHTML = input; // Direct XSS injection
    eval("var result = " + input); // Code injection via eval
}

// 4. Code Injection - CRITICAL
function processUserScript(userCode) {
    eval(userCode); // Direct code execution
    Function(userCode)(); // Alternative code execution
}

// 6. Insecure randomness for crypto
function generateToken() {
    return Math.random().toString(36); // Inseguro para criptografía
}

// 7. Command injection
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