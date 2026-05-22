import sqlite3
import os
from datetime import datetime

DB_FILE = "accessibility.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS telemetry')
    c.execute('''
        CREATE TABLE telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            timestamp DATETIME,
            target_url TEXT,
            mouse_speed_avg REAL,
            click_accuracy REAL,
            scroll_speed_avg REAL,
            time_on_page REAL,
            suggested_profile TEXT,
            manual_override BOOLEAN,
            override_feature TEXT,
            override_value TEXT
        )
    ''')
    conn.commit()
    conn.close()

def insert_telemetry(session_id, url, data, profile="default"):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO telemetry (
            session_id, timestamp, target_url, 
            mouse_speed_avg, click_accuracy, scroll_speed_avg, time_on_page, suggested_profile,
            manual_override, override_feature, override_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        session_id, 
        datetime.now(), 
        url,
        data.get('mouse_speed_avg', 0.0),
        data.get('click_accuracy', 1.0),
        data.get('scroll_speed_avg', 0.0),
        data.get('time_on_page', 0.0),
        profile,
        data.get('manual_override', False),
        str(data.get('override_feature', '')),
        str(data.get('override_value', ''))
    ))
    conn.commit()
    conn.close()

def get_session_history(session_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM telemetry WHERE session_id = ? ORDER BY timestamp DESC', (session_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
