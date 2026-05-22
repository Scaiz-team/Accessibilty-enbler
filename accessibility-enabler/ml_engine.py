import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import os
import pickle

MODEL_FILE = 'accessibility_model.pkl'

PROFILES = {
    0: 'default',
    1: 'large_text',     # Low click accuracy, slow mouse
    2: 'high_contrast',  # Long time on page, slow scroll
    3: 'simplified'      # Erratic mouse, high time
}

def generate_synthetic_data(n_samples=1000):
    # Features: mouse_speed_avg, click_accuracy, scroll_speed_avg, time_on_page
    np.random.seed(42)
    X = []
    y = []
    
    for _ in range(n_samples):
        profile_idx = np.random.randint(0, 4)
        if profile_idx == 0: # default
            x = [np.random.normal(500, 100), np.random.normal(0.95, 0.05), np.random.normal(200, 50), np.random.normal(60, 20)]
        elif profile_idx == 1: # large_text
            x = [np.random.normal(200, 50), np.random.normal(0.6, 0.15), np.random.normal(100, 30), np.random.normal(120, 30)]
        elif profile_idx == 2: # high_contrast
            x = [np.random.normal(300, 80), np.random.normal(0.85, 0.1), np.random.normal(80, 20), np.random.normal(180, 50)]
        else: # simplified
            x = [np.random.normal(800, 200), np.random.normal(0.7, 0.2), np.random.normal(300, 100), np.random.normal(200, 60)]
            
        # Ensure values are sensible
        x[1] = max(0.0, min(1.0, x[1])) # accuracy between 0 and 1
        X.append(x)
        y.append(profile_idx)
        
    return np.array(X), np.array(y)

def train_baseline_model():
    X, y = generate_synthetic_data(2000)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)
    with open(MODEL_FILE, 'wb') as f:
        pickle.dump(clf, f)
    print("Baseline model trained and saved.")

def get_model():
    if not os.path.exists(MODEL_FILE):
        train_baseline_model()
    with open(MODEL_FILE, 'rb') as f:
        return pickle.load(f)

def predict_profile(telemetry_data):
    """
    telemetry_data: dict with keys: mouse_speed_avg, click_accuracy, scroll_speed_avg, time_on_page
    """
    model = get_model()
    # default values if missing
    features = np.array([[
        telemetry_data.get('mouse_speed_avg', 500.0),
        telemetry_data.get('click_accuracy', 0.95),
        telemetry_data.get('scroll_speed_avg', 200.0),
        telemetry_data.get('time_on_page', 60.0)
    ]])
    prediction = model.predict(features)[0]
    return PROFILES.get(prediction, 'default')

if __name__ == '__main__':
    train_baseline_model()
