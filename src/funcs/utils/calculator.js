// --- CALCULADORA CIENTÍFICA ---
// Sem dependência externa - parser seguro de expressões matemáticas

const CONFIG = {
    MAX_EXPRESSION_LENGTH: 200,
    MAX_RESULT_DECIMALS: 10,
    MAX_NUMBER: 1e15,
    MIN_NUMBER: -1e15
};

// Constantes matemáticas
const CONSTANTS = {
    'pi': Math.PI,
    'π': Math.PI,
    'e': Math.E,
    'phi': (1 + Math.sqrt(5)) / 2, // Proporção áurea
    'φ': (1 + Math.sqrt(5)) / 2
};

// Funções matemáticas disponíveis
const FUNCTIONS = {
    // Trigonométricas
    'sin': Math.sin,
    'cos': Math.cos,
    'tan': Math.tan,
    'asin': Math.asin,
    'acos': Math.acos,
    'atan': Math.atan,
    'sinh': Math.sinh,
    'cosh': Math.cosh,
    'tanh': Math.tanh,
    
    // Logaritmos e exponenciais
    'log': Math.log10,
    'log10': Math.log10,
    'log2': Math.log2,
    'ln': Math.log,
    'exp': Math.exp,
    
    // Raízes e potências
    'sqrt': Math.sqrt,
    'cbrt': Math.cbrt,
    'pow': Math.pow,
    
    // Arredondamento
    'abs': Math.abs,
    'ceil': Math.ceil,
    'floor': Math.floor,
    'round': Math.round,
    'trunc': Math.trunc,
    
    // Outros
    'sign': Math.sign,
    'max': Math.max,
    'min': Math.min,
    'random': Math.random,
    
    // Conversões
    'rad': (deg) => deg * (Math.PI / 180),
    'deg': (rad) => rad * (180 / Math.PI),
    
    // Fatorial
    'fact': (n) => {
        if (n < 0 || !Number.isInteger(n)) return NaN;
        if (n > 170) return Infinity;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    },
    
    // Porcentagem
    'percent': (value, percent) => value * (percent / 100)
};

// Tokenizar expressão
const tokenize = (expression) => {
    const tokens = [];
    let current = '';
    let i = 0;
    
    while (i < expression.length) {
        const char = expression[i];
        
        // Números (incluindo decimais e notação científica)
        if (/[0-9.]/.test(char)) {
            current += char;
            i++;
            while (i < expression.length && /[0-9.eE+-]/.test(expression[i])) {
                // Verificar notação científica
                if ((expression[i] === '+' || expression[i] === '-') && 
                    !(expression[i-1] === 'e' || expression[i-1] === 'E')) {
                    break;
                }
                current += expression[i];
                i++;
            }
            tokens.push({ type: 'number', value: parseFloat(current) });
            current = '';
            continue;
        }
        
        // Identificadores (funções e constantes)
        if (/[a-zA-Zπφ]/.test(char)) {
            current += char;
            i++;
            while (i < expression.length && /[a-zA-Z0-9]/.test(expression[i])) {
                current += expression[i];
                i++;
            }
            const lower = current.toLowerCase();
            if (CONSTANTS[lower] !== undefined) {
                tokens.push({ type: 'number', value: CONSTANTS[lower] });
            } else if (FUNCTIONS[lower]) {
                tokens.push({ type: 'function', value: lower });
            } else {
                throw new Error(`Função ou constante desconhecida: ${current}`);
            }
            current = '';
            continue;
        }
        
        // Operadores
        if (['+', '-', '*', '/', '^', '%'].includes(char)) {
            tokens.push({ type: 'operator', value: char });
            i++;
            continue;
        }
        
        // Parênteses
        if (char === '(') {
            tokens.push({ type: 'lparen', value: '(' });
            i++;
            continue;
        }
        if (char === ')') {
            tokens.push({ type: 'rparen', value: ')' });
            i++;
            continue;
        }
        
        // Vírgula (para funções com múltiplos argumentos)
        if (char === ',') {
            tokens.push({ type: 'comma', value: ',' });
            i++;
            continue;
        }
        
        // Ignorar espaços
        if (/\s/.test(char)) {
            i++;
            continue;
        }
        
        // Caractere desconhecido
        throw new Error(`Caractere inválido: ${char}`);
    }
    
    return tokens;
};

// Parser com precedência de operadores
const parse = (tokens) => {
    let pos = 0;
    
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    
    // Expressão: termo ((+|-) termo)*
    const expression = () => {
        let left = term();
        
        while (peek() && peek().type === 'operator' && ['+', '-'].includes(peek().value)) {
            const op = consume().value;
            const right = term();
            left = { type: 'binary', operator: op, left, right };
        }
        
        return left;
    };
    
    // Termo: fator ((*|/|%) fator)*
    const term = () => {
        let left = power();
        
        while (peek() && peek().type === 'operator' && ['*', '/', '%'].includes(peek().value)) {
            const op = consume().value;
            const right = power();
            left = { type: 'binary', operator: op, left, right };
        }
        
        return left;
    };
    
    // Potência: unário (^ potência)?
    const power = () => {
        let left = unary();
        
        if (peek() && peek().type === 'operator' && peek().value === '^') {
            consume();
            const right = power(); // Right-associative
            left = { type: 'binary', operator: '^', left, right };
        }
        
        return left;
    };
    
    // Unário: (+|-) unário | fator
    const unary = () => {
        if (peek() && peek().type === 'operator' && ['+', '-'].includes(peek().value)) {
            const op = consume().value;
            const operand = unary();
            return { type: 'unary', operator: op, operand };
        }
        return factor();
    };
    
    // Fator: número | função(expr) | (expr)
    const factor = () => {
        const token = peek();
        
        if (!token) {
            throw new Error('Expressão incompleta');
        }
        
        if (token.type === 'number') {
            consume();
            return { type: 'number', value: token.value };
        }
        
        if (token.type === 'function') {
            const funcName = consume().value;
            if (!peek() || peek().type !== 'lparen') {
                throw new Error(`Esperado '(' após função ${funcName}`);
            }
            consume(); // (
            
            const args = [];
            if (peek() && peek().type !== 'rparen') {
                args.push(expression());
                while (peek() && peek().type === 'comma') {
                    consume(); // ,
                    args.push(expression());
                }
            }
            
            if (!peek() || peek().type !== 'rparen') {
                throw new Error(`Esperado ')' após argumentos de ${funcName}`);
            }
            consume(); // )
            
            return { type: 'function', name: funcName, args };
        }
        
        if (token.type === 'lparen') {
            consume(); // (
            const expr = expression();
            if (!peek() || peek().type !== 'rparen') {
                throw new Error('Esperado \')\'');
            }
            consume(); // )
            return expr;
        }
        
        throw new Error(`Token inesperado: ${token.value}`);
    };
    
    const result = expression();
    
    if (pos < tokens.length) {
        throw new Error(`Token inesperado: ${tokens[pos].value}`);
    }
    
    return result;
};

// Avaliar AST
const evaluate = (node) => {
    if (node.type === 'number') {
        return node.value;
    }
    
    if (node.type === 'unary') {
        const operand = evaluate(node.operand);
        return node.operator === '-' ? -operand : operand;
    }
    
    if (node.type === 'binary') {
        const left = evaluate(node.left);
        const right = evaluate(node.right);
        
        switch (node.operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': 
                if (right === 0) throw new Error('Divisão por zero');
                return left / right;
            case '%': return left % right;
            case '^': return Math.pow(left, right);
        }
    }
    
    if (node.type === 'function') {
        const func = FUNCTIONS[node.name];
        const args = node.args.map(evaluate);
        return func(...args);
    }
    
    throw new Error('Nó desconhecido na AST');
};

// Função principal de cálculo
const calculate = (expression, prefix = '/') => {
    if (!expression || expression.trim().length === 0) {
        return {
            success: false,
            message: `🧮 *CALCULADORA*\n\n❌ Digite uma expressão!\n\n` +
                     `💡 Uso: ${prefix}calcular <expressão>\n` +
                     `📌 Exemplo: ${prefix}calcular 2+2*5\n\n` +
                     `📐 *Funções disponíveis:*\n` +
                     `• sin, cos, tan, asin, acos, atan\n` +
                     `• log, ln, sqrt, cbrt, pow\n` +
                     `• abs, ceil, floor, round\n` +
                     `• fact (fatorial), rad, deg\n\n` +
                     `📊 *Constantes:*\n` +
                     `• pi (π), e, phi (φ)`
        };
    }
    
    // Normalizar expressão
    let expr = expression.trim()
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/,/g, '.')
        .replace(/\^/g, '^')
        .replace(/\*\*/g, '^');
    
    if (expr.length > CONFIG.MAX_EXPRESSION_LENGTH) {
        return {
            success: false,
            message: `❌ Expressão muito longa! Máximo de ${CONFIG.MAX_EXPRESSION_LENGTH} caracteres.`
        };
    }
    
    try {
        const tokens = tokenize(expr);
        const ast = parse(tokens);
        let result = evaluate(ast);
        
        // Verificar limites
        if (!isFinite(result)) {
            if (isNaN(result)) {
                return { success: false, message: '❌ Resultado indefinido (NaN)' };
            }
            return { success: true, result: result > 0 ? '∞' : '-∞', expression: expr };
        }
        
        if (Math.abs(result) > CONFIG.MAX_NUMBER) {
            return { success: false, message: '❌ Resultado muito grande!' };
        }
        
        // Formatar resultado
        let formattedResult;
        if (Number.isInteger(result)) {
            formattedResult = result.toString();
        } else {
            formattedResult = parseFloat(result.toFixed(CONFIG.MAX_RESULT_DECIMALS)).toString();
        }
        
        return {
            success: true,
            result: formattedResult,
            expression: expr,
            message: `🧮 *CALCULADORA*\n\n` +
                     `📝 ${expr}\n\n` +
                     `📊 *Resultado:* ${formattedResult}`
        };
    } catch (err) {
        return {
            success: false,
            message: `🧮 *CALCULADORA*\n\n❌ Erro: ${err.message}\n\n💡 Verifique a expressão e tente novamente.`
        };
    }
};

// Conversões rápidas
const convert = (value, from, to) => {
    const conversions = {
        // Temperatura
        'c-f': (v) => v * 9/5 + 32,
        'f-c': (v) => (v - 32) * 5/9,
        'c-k': (v) => v + 273.15,
        'k-c': (v) => v - 273.15,
        
        // Distância
        'km-mi': (v) => v * 0.621371,
        'mi-km': (v) => v * 1.60934,
        'm-ft': (v) => v * 3.28084,
        'ft-m': (v) => v * 0.3048,
        'cm-in': (v) => v * 0.393701,
        'in-cm': (v) => v * 2.54,
        
        // Peso
        'kg-lb': (v) => v * 2.20462,
        'lb-kg': (v) => v * 0.453592,
        'g-oz': (v) => v * 0.035274,
        'oz-g': (v) => v * 28.3495,
        
        // Área
        'm2-ft2': (v) => v * 10.7639,
        'ft2-m2': (v) => v * 0.092903,
        
        // Volume
        'l-gal': (v) => v * 0.264172,
        'gal-l': (v) => v * 3.78541,
        'ml-oz': (v) => v * 0.033814,
        'oz-ml': (v) => v * 29.5735,
        
        // Dados
        'kb-mb': (v) => v / 1024,
        'mb-gb': (v) => v / 1024,
        'gb-tb': (v) => v / 1024,
        'mb-kb': (v) => v * 1024,
        'gb-mb': (v) => v * 1024,
        'tb-gb': (v) => v * 1024
    };
    
    const key = `${from.toLowerCase()}-${to.toLowerCase()}`;
    const converter = conversions[key];
    
    if (!converter) {
        const available = Object.keys(conversions).map(k => k.replace('-', ' → ')).join('\n');
        return {
            success: false,
            message: `❌ Conversão não suportada!\n\n📐 *Conversões disponíveis:*\n${available}`
        };
    }
    
    const result = converter(parseFloat(value));
    
    return {
        success: true,
        result: parseFloat(result.toFixed(6)),
        message: `📐 *CONVERSÃO*\n\n` +
                 `${value} ${from.toUpperCase()} = ${parseFloat(result.toFixed(6))} ${to.toUpperCase()}`
    };
};

export {
    calculate,
    convert,
    FUNCTIONS,
    CONSTANTS
};

export default {
    calculate,
    convert,
    FUNCTIONS,
    CONSTANTS
};
