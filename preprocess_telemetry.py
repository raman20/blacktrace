import os
import glob
import json
import pandas as pd
import pyarrow.parquet as pq

# Define paths
SOURCE_DIR = "/home/raman/blacktrace/player_data"
OUTPUT_DIR = "/home/raman/blacktrace/public/data"
MANIFEST_PATH = os.path.join(OUTPUT_DIR, "manifest.json")

def clean_match_id(raw_match_id):
    """Strip .nakama-0 suffix if present."""
    if isinstance(raw_match_id, bytes):
        raw_match_id = raw_match_id.decode('utf-8')
    if raw_match_id.endswith(".nakama-0"):
        return raw_match_id[:-9]
    return raw_match_id

def reorganize_data():
    print("Starting read-optimized JSON data reorganization...")
    
    # Dictionary to group raw file paths by (map_id, date, match_id)
    match_groups = {}
    
    # Walk through all subdirectories in SOURCE_DIR (skipping minimaps and hidden folders)
    folders = [os.path.join(SOURCE_DIR, d) for d in os.listdir(SOURCE_DIR)
               if os.path.isdir(os.path.join(SOURCE_DIR, d)) and not d.startswith(".") and d != "minimaps"]
    
    for folder in folders:
        date_folder = os.path.basename(folder)
        print(f"Scanning folder: {date_folder}...")
        
        files = [f for f in os.listdir(folder) if not f.startswith(".")]
        
        for f in files:
            filepath = os.path.join(folder, f)
            try:
                # Read only the first row to determine map_id and match_id
                first_row_table = pq.read_table(filepath, columns=["map_id", "match_id"])
                if len(first_row_table) == 0:
                    continue
                
                # Extract values
                map_id_val = first_row_table["map_id"][0].as_py()
                match_id_val = first_row_table["match_id"][0].as_py()
                
                # Decode if bytes
                if isinstance(map_id_val, bytes):
                    map_id = map_id_val.decode('utf-8')
                else:
                    map_id = str(map_id_val)
                    
                match_id = clean_match_id(match_id_val)
                
                key = (map_id, date_folder, match_id)
                if key not in match_groups:
                    match_groups[key] = []
                match_groups[key].append(filepath)
                
            except Exception as e:
                print(f"Error reading first row of {filepath}: {e}")
                continue

    print(f"Found {len(match_groups)} unique matches across the dataset.")
    
    manifest_entries = []
    
    # Process each match group
    for idx, (key, file_list) in enumerate(match_groups.items()):
        map_id, date_folder, match_id = key
        print(f"[{idx+1}/{len(match_groups)}] Processing match {match_id} ({map_id} on {date_folder}) with {len(file_list)} player files...")
        
        match_dfs = []
        for filepath in file_list:
            try:
                table = pq.read_table(filepath)
                df = table.to_pandas()
                match_dfs.append(df)
            except Exception as e:
                print(f"Error reading file {filepath}: {e}")
                continue
                
        if not match_dfs:
            continue
            
        combined_df = pd.concat(match_dfs, ignore_index=True)
        
        # 1. Cast/decode columns to clean types
        combined_df['user_id'] = combined_df['user_id'].apply(
            lambda x: x.decode('utf-8') if isinstance(x, bytes) else str(x)
        )
        combined_df['match_id'] = combined_df['match_id'].apply(clean_match_id)
        combined_df['map_id'] = combined_df['map_id'].apply(
            lambda x: x.decode('utf-8') if isinstance(x, bytes) else str(x)
        )
        combined_df['x'] = combined_df['x'].astype(float)
        combined_df['y'] = combined_df['y'].astype(float)
        combined_df['z'] = combined_df['z'].astype(float)
        
        # 2. Scale the timestamps from seconds to milliseconds
        # PyArrow parses seconds from file as ms datetime, making dates show in 1970 and scale down by 1000.
        # We multiply by 1000 to restore true epoch milliseconds (e.g. Feb 2026).
        combined_df['ts'] = combined_df['ts'].astype('int64') * 1000
        
        # 3. Align timelines: Make timestamps relative to the start of the match (ts starts at 0)
        min_ts = combined_df['ts'].min()
        combined_df['ts'] = combined_df['ts'] - min_ts
        
        # Sort by relative match timestamp 'ts' to align chronological events
        combined_df = combined_df.sort_values(by='ts').reset_index(drop=True)
        
        combined_df['event'] = combined_df['event'].apply(
            lambda x: x.decode('utf-8') if isinstance(x, bytes) else (str(x) if pd.notnull(x) else '')
        )
        
        # 4. Extract telemetry position data (trajectories)
        pos_df = combined_df[combined_df['event'].isin(['Position', 'BotPosition'])]
        trajectories = {}
        for uid, group in pos_df.groupby('user_id'):
            trajectories[uid] = group[['x', 'y', 'z', 'ts']].to_dict(orient='records')
            
        # 5. Extract non-position event markers
        evt_df = combined_df[~combined_df['event'].isin(['Position', 'BotPosition'])]
        events = evt_df[['user_id', 'event', 'x', 'y', 'z', 'ts']].to_dict(orient='records')
        
        # 6. Generate pre-binned heatmaps (rounded to 1 decimal place for density weight)
        # Traffic heatmap
        traffic_map = []
        if len(pos_df) > 0:
            pos_df_rounded = pos_df.copy()
            pos_df_rounded['x'] = pos_df_rounded['x'].round(1)
            pos_df_rounded['z'] = pos_df_rounded['z'].round(1)
            traffic_counts = pos_df_rounded.groupby(['x', 'z']).size().reset_index(name='weight')
            traffic_map = traffic_counts.to_dict(orient='records')
            
        # Kills heatmap
        kills_df = evt_df[evt_df['event'].isin(['Kill', 'BotKill'])]
        kills_map = []
        if len(kills_df) > 0:
            kills_df_rounded = kills_df.copy()
            kills_df_rounded['x'] = kills_df_rounded['x'].round(1)
            kills_df_rounded['z'] = kills_df_rounded['z'].round(1)
            kills_counts = kills_df_rounded.groupby(['x', 'z']).size().reset_index(name='weight')
            kills_map = kills_counts.to_dict(orient='records')
            
        # Deaths heatmap (including storm deaths)
        deaths_df = evt_df[evt_df['event'].isin(['Killed', 'BotKilled', 'KilledByStorm'])]
        deaths_map = []
        if len(deaths_df) > 0:
            deaths_df_rounded = deaths_df.copy()
            deaths_df_rounded['x'] = deaths_df_rounded['x'].round(1)
            deaths_df_rounded['z'] = deaths_df_rounded['z'].round(1)
            deaths_counts = deaths_df_rounded.groupby(['x', 'z']).size().reset_index(name='weight')
            deaths_map = deaths_counts.to_dict(orient='records')
            
        # Calculate duration
        duration_ms = int(combined_df['ts'].max()) if len(combined_df) > 0 else 0
        
        # 7. Compile final match structure
        match_data = {
            "match_id": match_id,
            "map_id": map_id,
            "date": date_folder,
            "duration_ms": duration_ms,
            "trajectories": trajectories,
            "events": events,
            "heatmaps": {
                "traffic": traffic_map,
                "kills": kills_map,
                "deaths": deaths_map
            }
        }
        
        # Calculate stats for manifest index
        unique_users = combined_df['user_id'].unique()
        human_count = 0
        bot_count = 0
        for uid in unique_users:
            if '-' in uid or len(uid) > 10:
                human_count += 1
            else:
                bot_count += 1
                
        total_kills = len(kills_df)
        
        # Define output directory
        output_dir_path = os.path.join(OUTPUT_DIR, map_id, date_folder)
        os.makedirs(output_dir_path, exist_ok=True)
        
        output_file_name = f"{match_id}.json"
        output_filepath = os.path.join(output_dir_path, output_file_name)
        
        # Write to JSON
        try:
            with open(output_filepath, 'w') as out_f:
                json.dump(match_data, out_f, separators=(',', ':')) # compact write (removes whitespaces)
        except Exception as e:
            print(f"Error writing output JSON for match {match_id}: {e}")
            continue
            
        rel_file_path = f"data/{map_id}/{date_folder}/{output_file_name}"
        manifest_entries.append({
            "match_id": match_id,
            "map_id": map_id,
            "date": date_folder,
            "duration_ms": duration_ms,
            "human_count": human_count,
            "bot_count": bot_count,
            "total_kills": total_kills,
            "total_events": len(combined_df),
            "file_path": rel_file_path
        })
        
    # Write manifest.json
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(MANIFEST_PATH, 'w') as f:
        json.dump(manifest_entries, f, indent=2)
        
    print(f"Reorganization complete! Created manifest.json with {len(manifest_entries)} entries.")

if __name__ == "__main__":
    reorganize_data()
