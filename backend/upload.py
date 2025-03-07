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
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        category = request.form.get('category', 'Uncategorized')  # Default to 'Uncategorized'
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if file and file.filename.endswith('.pdf'):
            # Ensure the category folder exists
            category_path = os.path.join(app.config['UPLOAD_FOLDER'], category)
            if not os.path.exists(category_path):
                os.makedirs(category_path)

            # Save the file in the category folder
            unique_filename = f"{os.path.splitext(file.filename)[0]}_{int(time.time())}.pdf"
            file_path = os.path.join(category_path, unique_filename)
            file.save(file_path)

            # Fetch the category_id from the database
            conn = get_db_connection()
            cursor = conn.cursor()

            if category == "Uncategorized":
                category_id = None
            else:
                cursor.execute("SELECT id FROM categories WHERE name = %s", (category,))
                result = cursor.fetchone()
                if result:
                    category_id = result[0]
                else:
                    return jsonify({"error": "Category not found"}), 400

            # Save metadata to the database
            cursor.execute(
                "INSERT INTO plays (file_name, file_path, category_id) VALUES (%s, %s, %s)",
                (unique_filename, file_path, category_id)
            )
            conn.commit()
            file_id = cursor.lastrowid
            cursor.close()
            conn.close()

            return jsonify({"message": "File uploaded successfully", "file_id": file_id}), 200
        else:
            return jsonify({"error": "Invalid file type. Only PDFs are allowed."}), 400
    except Exception as e:
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

# Endpoint to list all categories
@app.route('/categories', methods=['GET'])
def get_categories():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM categories")
        categories = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()

        return jsonify(categories), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    
# Endpoint to create new category
@app.route('/categories', methods=['POST'])
def create_category():
    try:
        data = request.get_json()
        category_name = data.get('name')
        if not category_name:
            return jsonify({"error": "Category name is required"}), 400

        # Check if the category already exists in the database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
        existing_category = cursor.fetchone()

        if existing_category:
            cursor.close()
            conn.close()
            return jsonify({"error": "Category already exists"}), 400

        # Create the category folder if it doesn't exist
        category_path = os.path.join(app.config['UPLOAD_FOLDER'], category_name)
        if not os.path.exists(category_path):
            os.makedirs(category_path)

        # Add the category to the database
        cursor.execute("INSERT INTO categories (name) VALUES (%s)", (category_name,))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Category created successfully"}), 201
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    
# Endpoint to delete a category and its contents
@app.route('/categories/<string:category_name>', methods=['DELETE'])
def delete_category(category_name):
    try:
        category_path = os.path.join(app.config['UPLOAD_FOLDER'], category_name)
        if os.path.exists(category_path) and os.path.isdir(category_path):
            # Delete the folder and its contents
            for root, dirs, files in os.walk(category_path, topdown=False):
                for file in files:
                    os.remove(os.path.join(root, file))
                for dir in dirs:
                    os.rmdir(os.path.join(root, dir))
            os.rmdir(category_path)
            return jsonify({"message": "Category deleted successfully"}), 200
        else:
            return jsonify({"error": "Category not found"}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    
# Endpoint to fetch all uploaded files
@app.route('/uploads', methods=['GET'])
def get_files():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Fetch files and their categories
        cursor.execute("""
            SELECT plays.id, plays.file_name, categories.name AS category
            FROM plays
            LEFT JOIN categories ON plays.category_id = categories.id
        """)
        files = cursor.fetchall()
        cursor.close()
        conn.close()

        # Format the response
        return jsonify([
            {"id": row[0], "file_name": row[1], "category": row[2] or "Uncategorized"}
            for row in files
        ]), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Get files by category
@app.route('/uploads/category/<string:category_name>', methods=['GET'])
def get_files_by_category(category_name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # If the category is "All", fetch all files
        if category_name == "All":
            cursor.execute("""
                SELECT plays.id, plays.file_name, categories.name AS category
                FROM plays
                LEFT JOIN categories ON plays.category_id = categories.id
            """)
        else:
            # Fetch files in the specified category
            cursor.execute("""
                SELECT plays.id, plays.file_name
                FROM plays
                JOIN categories ON plays.category_id = categories.id
                WHERE categories.name = %s
            """, (category_name,))

        files = cursor.fetchall()
        cursor.close()
        conn.close()

        # Format the response
        return jsonify([{"id": row[0], "file_name": row[1]} for row in files]), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    
if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)