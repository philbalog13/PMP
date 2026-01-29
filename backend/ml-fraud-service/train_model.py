"""
Training Pipeline for Fraud Detection
Collects data, trains model, and deploys
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import pickle
import os

class FraudModelTrainer:
    def __init__(self):
        self.models = {}
        
    def load_transaction_data(self, filepath='data/transactions.csv'):
        """Load transaction data from CSV"""
        if not os.path.exists(filepath):
            print(f"⚠ Data file not found: {filepath}")
            return self.generate_synthetic_data()
        return pd.read_csv(filepath)
    
    def generate_synthetic_data(self, n_samples=10000):
        """Generate synthetic transaction data for training"""
        np.random.seed(42)
        
        # Normal transactions (90%)
        n_normal = int(n_samples * 0.9)
        normal_data = {
            'amount': np.random.exponential(50, n_normal),
            'hour': np.random.randint(8, 22, n_normal),
            'day_of_week': np.random.randint(0, 7, n_normal),
            'mcc_high_risk': np.random.choice([0, 1], n_normal, p=[0.95, 0.05]),
            'card_present': np.random.choice([0, 1], n_normal, p=[0.3, 0.7]),
            'international': np.random.choice([0, 1], n_normal, p=[0.9, 0.1]),
            'is_fraud': np.zeros(n_normal)
        }
        
        # Fraudulent transactions (10%)
        n_fraud = n_samples - n_normal
        fraud_data = {
            'amount': np.random.exponential(200, n_fraud),  # Higher amounts
            'hour': np.random.randint(0, 6, n_fraud),  # Unusual hours
            'day_of_week': np.random.randint(0, 7, n_fraud),
            'mcc_high_risk': np.random.choice([0, 1], n_fraud, p=[0.4, 0.6]),  # More risky
            'card_present': np.zeros(n_fraud),  # Card not present
            'international': np.ones(n_fraud),  # International
            'is_fraud': np.ones(n_fraud)
        }
        
        # Combine
        df_normal = pd.DataFrame(normal_data)
        df_fraud = pd.DataFrame(fraud_data)
        df = pd.concat([df_normal, df_fraud]).sample(frac=1).reset_index(drop=True)
        
        return df
    
    def train_isolation_forest(self, X):
        """Train Isolation Forest (unsupervised)"""
        model = IsolationForest(contamination=0.1, random_state=42)
        model.fit(X)
        self.models['isolation_forest'] = model
        print("✓ Isolation Forest trained")
        return model
    
    def train_random_forest(self, X, y):
        """Train Random Forest (supervised)"""
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X, y)
        self.models['random_forest'] = model
        print("✓ Random Forest trained")
        return model
    
    def train_gradient_boosting(self, X, y):
        """Train Gradient Boosting (supervised)"""
        model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        model.fit(X, y)
        self.models['gradient_boosting'] = model
        print("✓ Gradient Boosting trained")
        return model
    
    def evaluate_model(self, model, X_test, y_test, model_name):
        """Evaluate model performance"""
        if model_name == 'isolation_forest':
            predictions = model.predict(X_test)
            predictions = np.where(predictions == -1, 1, 0)  # Convert to binary
        else:
            predictions = model.predict(X_test)
        
        print(f"\n=== {model_name} Performance ===")
        print(classification_report(y_test, predictions))
        
        if model_name != 'isolation_forest':
            proba = model.predict_proba(X_test)[:, 1]
            auc = roc_auc_score(y_test, proba)
            print(f"ROC AUC Score: {auc:.4f}")
    
    def save_model(self, model_name='isolation_forest', output_path='model/fraud_model.pkl'):
        """Save trained model"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            pickle.dump(self.models[model_name], f)
        print(f"✓ Model saved to {output_path}")

if __name__ == '__main__':
    trainer = FraudModelTrainer()
    
    # Load data
    print("Loading transaction data...")
    df = trainer.load_transaction_data()
    
    # Prepare features
    feature_cols = ['amount', 'hour', 'day_of_week', 'mcc_high_risk', 'card_present', 'international']
    X = df[feature_cols].values
    y = df['is_fraud'].values if 'is_fraud' in df.columns else None
    
    # Normalize amount
    X[:, 0] = X[:, 0] / 10000.0
    X[:, 1] = X[:, 1] / 24.0
    X[:, 2] = X[:, 2] / 7.0
    
    # Split for supervised models
    if y is not None:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    else:
        X_train, X_test = X, X
        y_train, y_test = None, None
    
    # Train models
    print("\nTraining models...")
    trainer.train_isolation_forest(X_train)
    
    if y is not None:
        trainer.train_random_forest(X_train, y_train)
        trainer.train_gradient_boosting(X_train, y_train)
        
        # Evaluate
        for name, model in trainer.models.items():
            trainer.evaluate_model(model, X_test, y_test, name)
    
    # Save best model
    trainer.save_model('isolation_forest')
    print("\n✅ Training complete!")
