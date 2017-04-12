// symbolic expression parsing and calculating

class Expression extends Array {
  constructor(list) { super(...list) }
  args() { return this.slice(1,this.length) }
  sign() { return this[0] }
}
Expression.prototype.isExp = true

/* Expression

# Operators Supported and Operator precedence

  According to JavaScript Standard: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence]
    20: Grouping              : ( ... )
    16: Logical NOT           : NOT, ~
        Unary Plus            : +
        Unary Negation        : -
    14: Multiplication        : *
        Division              : /, DIV
        Remainder             : %, MOD
    13: Addition              : +
        Subtraction           : -
    12: Bitwise Left Shift    : <<, SHL
        Bitwise Right Shift   : >>, SHR
    11: Less Than             : <, LT
        Less Than Or Equal    : <=, LE
        Greater Than          : >, GT
        Greater Than Or Equal : >=, GE
    10: Equality              : =, ==, EQ
        Inequality            : !=, <>, NE
    9:  Bitwise AND           : AND, &
    8:  Bitwise XOR           : XOR, ^
    7:  Bitwise OR            : OR, |

# Data type

 - Integer (signed)
   - dec: 10, 235, -123
   - hex: 23h, 0abh, 0x2a4
   - bin: 100010b, 0b0110101
 - String refer to data variable
   - alphabet(Case-sensitive), digital, underscore(_), dollar($)
   - digital start not allowed
 - Char with quotation mark '.'
   - only one char allowed or error throw, or escape character
   - escape characte: '\t', '\n', '\r', '\b', '\x**', '\'', '\\'
   - char will be parse as integer

 */

Expression.parse = () => {}

module.exports = Expression
