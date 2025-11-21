import sys
import os
import json
import pandas as pd
import importlib
from sklearn.model_selection import train_test_split

# ------------------------------
# SETUP PATHS
# ------------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

dataset_path = sys.argv[1]
selected_models_json = sys.argv[2]
output_dir = current_dir

print(f"[Model Handler] Started. Loading: {dataset_path}")

# ------------------------------
# 1. LOAD DATA
# ------------------------------
try:
    df = pd.read_csv(dataset_path)
except Exception as e:
    print(f"[ERROR] Error loading dataset: {e}")
    sys.exit(1)

# ------------------------------
# 2. SPLIT DATA (Train/Test)
# ------------------------------
# Note: For Unsupervised learning, we assume the last column *might* be a target
# (which we want to ignore), or the dataset is purely features.
target_col = df.columns[-1]
feature_cols = df.columns[:-1]

X = df[feature_cols]
y = df[target_col]

# We keep the split to validate stability, even for clustering
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

train_df = pd.concat([X_train, y_train], axis=1)
test_df = pd.concat([X_test, y_test], axis=1)

train_path = os.path.join(output_dir, "train_dataset.csv")
test_path = os.path.join(output_dir, "test_dataset.csv")

train_df.to_csv(train_path, index=False)
test_df.to_csv(test_path, index=False)

print(f"[INFO] Data Split & Saved:\n  - {train_path}\n  - {test_path}")

# ------------------------------
# 3. DYNAMIC MODEL TRAINING
# ------------------------------
selected_models = json.loads(selected_models_json)

# Updated Map with all Scikit-Learn Clustering Models
model_file_map = {
    "kmeans": "kmeans",
    "minibatch_kmeans": "minibatch_kmeans",
    "k_medoids": "k_medoids",
    "gmm": "gmm",
    "dbscan": "dbscan",
    "optics": "optics",                    
    "hierarchical": "hierarchical",        
    "meanshift": "meanshift",              
    "birch": "birch",                       
    "affinity_propagation": "affinity_propagation", 
    "spectral": "spectral" 
}

results = []

for model_info in selected_models:
    model_name = model_info.get("name")
    model_label = model_info.get("label")
    
    if model_name not in model_file_map:
        print(f"[WARNING] No python script found for {model_label} ({model_name})")
        continue

    script_name = model_file_map[model_name]
    
    print(f"\n[TRAINING] Training {model_label}...")

    try:
        # Dynamically import the script from 'models' folder
        module = importlib.import_module(f"models.{script_name}")
        
        # --- UNIFIED SAVE PATH ---
        # Since all are Scikit-Learn compatible, we use .pkl for everything
        model_path = os.path.join(output_dir, f"{model_name}_model.pkl")
        
        # Train the model
        # Ensure your individual model scripts return the SIL, DBI, CHI metrics dict
        metrics = module.train(
            X_train, y_train, 
            X_test, y_test, 
            train_path, test_path, 
            target_col,
            model_path
        )
        
        print(f"[SUCCESS] {model_label} Finished. Metrics: {metrics}")
        
        results.append({
            "model": model_label,
            "metrics": metrics,
            "path": model_path
        })

    except Exception as e:
        print(f"[ERROR] Error training {model_label}: {str(e)}")
        import traceback
        traceback.print_exc()


print("\n__JSON_START__")
print(json.dumps(results))
print("__JSON_END__")