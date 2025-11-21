import sys
import os
import json
import importlib
import pandas as pd

# ------------------------------
# FIX: Add project root to sys.path
# ------------------------------
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)
# ------------------------------

dataset_path = sys.argv[1]
modules_json = sys.argv[2]
output_path = sys.argv[3]

# Load mapping file (one folder above)
json_path = os.path.join(os.path.dirname(__file__), "normal_preprocessing_modules.json")

with open(json_path, "r", encoding="utf-8") as f:
    module_map = json.load(f)

id_to_label = {m["id"]: m["name"] for m in module_map}

modules = json.loads(modules_json)
print("Modules received:", modules)

# Load dataset safely
import chardet, csv

def load_dataset(path):
    with open(path, "rb") as f:
        enc = chardet.detect(f.read())["encoding"]

    with open(path, "r", encoding=enc, errors="replace") as f:
        sample = f.read(2048)
        try:
            delim = csv.Sniffer().sniff(sample).delimiter
        except:
            delim = ","

    return pd.read_csv(
        path,
        encoding=enc,
        delimiter=delim,
        on_bad_lines="skip",
        engine="python"
    )

df = load_dataset(dataset_path)

def label_to_python_filename(label):
    return label.lower().replace(" ", "_").replace("-", "_")

for module in modules:
    module_id = module["id"]
    module_label = id_to_label.get(module_id)

    if not module_label:
        print("Module ID not found:", module_id)
        continue

    python_file = label_to_python_filename(module_label)

    print(f"Running {module_label} (id={module_id}) -> File: {python_file}.py")

    try:
        mod = importlib.import_module(
            f"preprocessing.Normal_preprocessing.components.{python_file}"
        )

        df = mod.apply(df)

        print("Finished:", module_label)

    except Exception as e:
        print("ERROR in", module_label, ":", str(e))
        continue

df.to_csv(output_path, index=False)
print("Preprocessing done. Saved:", output_path)
