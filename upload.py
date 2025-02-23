from flask import Flask, request, jsonify, send_file, render_template
import mysql.connector
import os
import time
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # CORS for all routes

UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Make sure the uploads directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

db_config = {
    'host': 'localhost',
    'user': 'root',  
    'password': 'admin123',  
    'database': 'volleyball_plays'  
}

# Database connection helper
def get_db_connection():
    return mysql.connector.connect(**db_config)

# Home route to serve HTML page
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint to upload a file
@app.route('/uploads', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            print("No file part in the request")  # Debugging 
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            print("No file selected for upload")  # Debugging 
            return jsonify({"error": "No selected file"}), 400
        if file and file.filename.endswith('.pdf'):
            # Generate a unique file name to avoid overwriting
            unique_filename = f"{os.path.splitext(file.filename)[0]}_{int(time.time())}.pdf"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            print(f"Saving file to: {file_path}")  # Debugging 
            file.save(file_path)

            # Save metadata to the MySQL database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO plays (file_name, file_path) VALUES (%s, %s)",
                (unique_filename, file_path)
            )
            conn.commit()
            file_id = cursor.lastrowid
            cursor.close()
            conn.close()

            print(f"File uploaded successfully with ID: {file_id}")  # Debugging 
            return jsonify({"message": "File uploaded successfully", "file_id": file_id}), 200
        else:
            print("Invalid file type")  # Debugging 
            return jsonify({"error": "Invalid file type. Only PDFs are allowed."}), 400
    except Exception as e:
        print(f"Error during file upload: {str(e)}")  # Debugging 
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    
# Endpoint to retrieve all files
@app.route('/uploads', methods=['GET'])
def get_files():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, file_name FROM plays")  # Querying the database
            files = cursor.fetchall()
            print("Files fetched from database:", files)  # Debugging log
            # Ensure the response is an array of objects with id and file_name
            return jsonify([{"id": row[0], "file_name": row[1]} for row in files]), 200
    except Exception as e:
        print(f"Error fetching files: {str(e)}")  # Debugging log
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Endpoint to download a file by ID
@app.route('/uploads/<int:id>', methods=['GET'])
def download_file(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT file_path FROM plays WHERE id = %s", (id,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        if result:
            file_path = result[0]
            return send_file(file_path, as_attachment=True)
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Endpoint to delete a file by ID
@app.route('/uploads/<int:id>', methods=['DELETE'])
def delete_file(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT file_path FROM plays WHERE id = %s", (id,))
        result = cursor.fetchone()
        if result:
            file_path = result[0]
            if os.path.exists(file_path):
                os.remove(file_path)  # Delete the file from the filesystem
            cursor.execute("DELETE FROM plays WHERE id = %s", (id,))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({"message": "File deleted successfully"}), 200
        else:
            cursor.close()
            conn.close()
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
