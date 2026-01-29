# Workshops

## Workshop 1: The 4-Corner Model

**Objective**: Trace a transaction from TPE to Issuer.

1.  Open the **TPE Web** (localhost:3002).
2.  Input amount `100.00` and PAN `4111...` (Visa).
3.  Submit.
4.  Open the **Dashboard** (localhost:3000) > Logs.
5.  **Task**: Find the log entries for:
    -   Acquirer receiving request.
    -   Switch routing to "Visa Network".
    -   Issuer approving.

## Workshop 2: ISO 8583 Basics

**Objective**: Decode a raw message.

**Simulated Message**:
```json
{
  "000": "0100",
  "002": "4111111111111111",
  "004": "000000001000",
  "049": "978"
}
```

**Task**:
1.  Identify the **MTI** (Message Type Indicator). Is it a Request or Response?
    -   *Hint*: `0100` = Authorization Request.
2.  Convert field `004` (Amount) to a decimal value.
    -   *Hint*: Last 2 digits are cents. `1000` -> `10.00`.
3.  Identify the Currency Code `978`.
    -   *Hint*: Look up ISO 4217.

## Workshop 3: PIN Blocks (Code Challenge)

**Objective**: Implement function to validate PIN Block Format 0.

**Theory**:
PIN Block = `PIN Field` XOR `PAN Field`.
-   PIN Field: `0 L P P P P F F F F F F F F F F` (L=Length, P=PIN)
-   PAN Field: `0 0 0 0 A A A A A A A A A A A A` (A=12 rightmost digits excluding check digit)

**Task**:
Modify `backend/crypto-service/src/labs/pin_lab.ts` to implement the XOR logic.
Run `npm test tests/pedagogical/workshops/workshop-2-pin-block.test.ts` to verify.
