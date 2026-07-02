import psycopg2
import os

# Database Connection Details
DB_PARAMS = {
    "dbname": "nexus_social",
    "user": "postgres",
    "password": "admin",
    "host": "127.0.0.1",
    "port": "5432"
}

# SQL Files in order of execution (dependencies first)
SQL_FILES = [
    "src/sql/mock_supabase_schema.sql",
    "src/sql/phase1_setup.sql",
    "master_ai_schema.sql",
    "sprint9_schema.sql",
    "supabase/migrations/sprint12_competitive_gaps.sql",
    "ai_schema.sql",
    "enterprise_schema.sql",
    "omnichannel_schema.sql",
    "reputation_schema.sql",
    "sprint8_custom_domains.sql",
    "sprint8_schema.sql",
    "sprint10_schema.sql",
    "sprint11_schema.sql",
    "week2_schema.sql",
    "week3_schema.sql",
    "week4_schema.sql",
    "week5_schema.sql",
    "src/sql/create_get_workspace_analytics.sql"
]

def run_sql_file(cur, file_path):
    print(f"Executing: {file_path}")
    if not os.path.exists(file_path):
        print(f"WARNING: File {file_path} not found. Skipping.")
        return True
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            sql = f.read()
        
        # Split sql commands by semicolon or execute as a block
        # executing as block is safer for multi-line functions/policies
        cur.execute(sql)
        print(f"SUCCESS: {file_path} executed.")
        return True
    except Exception as e:
        error_msg = str(e).lower()
        if "already exists" in error_msg:
            print(f"WARNING: Some objects in {file_path} already exist. Continuing.")
            return True
        print(f"ERROR executing {file_path}: {e}")
        return False

def main():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
        print("Connected to PostgreSQL database 'nexus_social'. Starting migrations...")
        
        success_count = 0
        for sql_file in SQL_FILES:
            if run_sql_file(cur, sql_file):
                success_count += 1
            else:
                print("Aborting migrations due to previous error.")
                break
                
        cur.close()
        conn.close()
        print(f"Migrations finished. Successfully executed {success_count} out of {len(SQL_FILES)} files.")
    except Exception as e:
        print(f"Failed to connect to database: {e}")

if __name__ == "__main__":
    main()
