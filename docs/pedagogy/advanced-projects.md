# Advanced Projects

For students who have completed the workshops, here are challenges to extend the platform.

## Project A: Add a New Card Scheme

**Goal**: Add support for "Amex-Sim" cards.

1.  **Routing**: Update `sim-network-switch` to recognize PANs starting with `34` or `37`.
2.  **Validation**: Update Luhn algorithm (if simulating non-Luhn schemes) or Length checks (15 digits).
3.  **UI**: Add Amex logo to `VirtualCard3D` component.

## Project B: AI Fraud Detection

**Goal**: Replace the rule-based engine with a Machine Learning model.

1.  **Data**: Export transaction logs to CSV.
2.  **Train**: Use Python (Scikit-Learn) to train an Isolation Forest model on the data.
3.  **Integrate**: Create a microservice (Flask/FastAPI) serving the model.
4.  **Connect**: Modify `sim-auth-engine` to call your ML service for a risk score.

## Project C: QR Code Payment

**Goal**: Implement MPM (Merchant Presented Mode) QR payment.

1.  **TPE**: Display a QR code containing Merchant ID + Amount.
2.  **Mobile App**: Create a simple mobile web view to "scan" (input) the QR data.
3.  **Flow**: Initiate a transaction from the "Mobile" instead of the "Card".
