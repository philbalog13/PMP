"""
ML Fraud Detection Service
Simple Isolation Forest model for anomaly detection
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Load or create model
MODEL_PATH = 'model/fraud_model.pkl'
model = None

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print(f"✓ Model loaded from {MODEL_PATH}")
    else:
        print("⚠ No trained model found. Using simple rules.")

def extract_features(transaction):
    """Extract numerical features from transaction"""
    features = []
    
    # Amount (normalized)
    amount = float(transaction.get('amount', 0))
    features.append(amount / 10000.0)  # Normalize to 0-1 range
    
    # Hour of day (0-23)
    hour = datetime.now().hour
    features.append(hour / 24.0)
    
    # Day of week (0-6)
    day_of_week = datetime.now().weekday()
    features.append(day_of_week / 7.0)
    
    # Merchant category (one-hot simplified)
    mcc = transaction.get('mcc', '0000')
    high_risk_mccs = ['7995', '5816', '5967']  # Gambling, games
    features.append(1.0 if mcc in high_risk_mccs else 0.0)
    
    # Card present
    features.append(1.0 if transaction.get('cardPresent', False) else 0.0)
    
    # International transaction
    features.append(1.0 if transaction.get('international', False) else 0.0)
    
    return np.array(features).reshape(1, -1)

def calculate_risk_score(features):
    """Calculate risk score using model or rules"""
    if model is not None:
        try:
            # Isolation Forest returns -1 for anomalies, 1 for normal
            prediction = model.predict(features)[0]
            anomaly_score = model.score_samples(features)[0]
            
            # Convert to 0-100 risk score (higher = more risky)
            risk_score = int((1 - anomaly_score) * 100)
            return max(0, min(100, risk_score))
        except Exception as e:
            print(f"Model prediction failed: {e}")
    
    # Fallback: Rule-based scoring
    score = 0
    feature_values = features[0]
    
    # High amount
    if feature_values[0] > 0.5:  # > 5000
        score += 30
    
    # Unusual hours (midnight to 5am)
    hour_normalized = feature_values[1]
    if hour_normalized < 0.2:  # 0-5am
        score += 20
    
    # High risk MCC
    if feature_values[3] == 1.0:
        score += 25
    
    # Card not present
    if feature_values[4] == 0.0:
        score += 15
    
    # International
    if feature_values[5] == 1.0:
        score += 10
    
    return min(score, 100)

def explain_prediction(features, risk_score):
    """Provide human-readable explanation"""
    reasons = []
    feature_values = features[0]
    
    if feature_values[0] > 0.5:
        reasons.append("High transaction amount")
    
    hour_normalized = feature_values[1]
    if hour_normalized < 0.2:
        reasons.append("Transaction during unusual hours (00:00-05:00)")
    
    if feature_values[3] == 1.0:
        reasons.append("High-risk merchant category (gambling/gaming)")
    
    if feature_values[4] == 0.0:
        reasons.append("Card not present transaction")
    
    if feature_values[5] == 1.0:
        reasons.append("International transaction")
    
    if not reasons:
        reasons.append("No significant risk factors detected")
    
    return reasons

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model is not None})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        transaction = request.json
        
        # Extract features
        features = extract_features(transaction)
        
        # Calculate risk
        risk_score = calculate_risk_score(features)
        
        # Determine action
        if risk_score >= 70:
            action = 'DECLINE'
            response_code = '59'  # Suspected fraud
        elif risk_score >= 40:
            action = 'REVIEW'
            response_code = '00'  # Approve but flag
        else:
            action = 'APPROVE'
            response_code = '00'
        
        # Explain
        reasons = explain_prediction(features, risk_score)
        
        return jsonify({
            'risk_score': risk_score,
            'action': action,
            'response_code': response_code,
            'reasons': reasons,
            'model_version': '1.0',
            'features': {
                'amount_normalized': float(features[0][0]),
                'hour': float(features[0][1]) * 24,
                'high_risk_mcc': bool(features[0][3])
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/train', methods=['POST'])
def train():
    """Endpoint to trigger model retraining (placeholder)"""
    return jsonify({'message': 'Training not implemented in minimal version'})

if __name__ == '__main__':
    load_model()
    app.run(host='0.0.0.0', port=8086, debug=True)
