function vulnerableFunction() {
    // Hardcoded API key - Semgrep detectará esto
    const apiKey = "sk-1234567890abcdef";
    
    // Eval usage - Semgrep detectará esto  
    const userInput = "alert('xss')";
    eval(userInput);
    
    // SQL injection potential
    const userId = req.params.id;
    const query = `SELECT * FROM users WHERE id = ${userId}`;
    
    // Insecure random
    Math.random(); // Para generar tokens
}

// Unused function
function unusedFunction() {
    console.log("This function is never called");
}

module.exports = { vulnerableFunction };