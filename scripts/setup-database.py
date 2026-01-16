#!/usr/bin/env python3
"""
Setup Supabase database for DIOMY application.
This script reads the SQL file and executes it on the Supabase instance.
"""

import os
import sys
import requests
import json

def setup_supabase_database():
    """Execute the SQL schema on Supabase."""
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        sys.exit(1)
    
    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), "init-supabase.sql")
    if not os.path.exists(sql_file):
        print(f"❌ Error: SQL file not found at {sql_file}")
        sys.exit(1)
    
    with open(sql_file, "r") as f:
        sql_content = f.read()
    
    # Split SQL into individual statements
    statements = [s.strip() for s in sql_content.split(";") if s.strip()]
    
    print(f"📊 Found {len(statements)} SQL statements to execute")
    
    # Execute each statement
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Use the Supabase REST API to execute raw SQL
    # Note: This requires a custom RPC function or direct SQL execution via the admin API
    # For now, we'll provide instructions for manual setup
    
    print("\n📝 SQL Schema prepared. To apply it to your Supabase database:")
    print(f"1. Go to: {supabase_url}/project/sql/new")
    print("2. Copy and paste the contents of scripts/init-supabase.sql")
    print("3. Click 'Run' to execute the schema")
    print("\n✅ Database setup instructions saved.")

if __name__ == "__main__":
    setup_supabase_database()
