import pandas as pd
from sklearn.preprocessing import KBinsDiscretizer

def apply(df: pd.DataFrame):
    if df.shape[1] < 2:
        return df

    X = df.iloc[:, :-1]
    y = df.iloc[:, -1]
    
    X_numeric_cols = X.select_dtypes(include=['number']).columns
    
    if len(X_numeric_cols) == 0:
        return df # No numeric columns to bin

    print(f"Binning: Applying to {list(X_numeric_cols)}")
    
    # Using 'quantile' strategy makes bins have equal number of samples
    discretizer = KBinsDiscretizer(n_bins=5, encode='ordinal', strategy='quantile', subsample=None)
    
    # Make a copy to avoid changing the original dataframe slice
    X_binned = X.copy()
    X_binned[X_numeric_cols] = discretizer.fit_transform(X[X_numeric_cols])
    
    # Re-attach target column
    X_binned[y.name] = y
    return X_binned