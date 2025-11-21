import joblib
import pandas as pd
from sklearn.cluster import MiniBatchKMeans
from .metrics_utils import calculate_metrics

def train(X_train, y_train, X_test, y_test, train_path, test_path, target_col, save_path):
    print("Training MiniBatch KMeans...")
    X_combined = pd.concat([X_train, X_test])
    
    # Simple auto-tuning for K (2 to 10)
    best_score = -1
    best_model = None
    
    for k in range(2, 11):
        model = MiniBatchKMeans(n_clusters=k, random_state=42, batch_size=256)
        labels = model.fit_predict(X_combined)
        
        metrics = calculate_metrics(X_combined, labels)
        if metrics["silhouette_score"] > best_score:
            best_score = metrics["silhouette_score"]
            best_model = model
            best_metrics = metrics

    joblib.dump(best_model, save_path)
    return {"algo": "MiniBatchKMeans", **best_metrics}