"""
Flask API for Volleyball Play Management
"""

# Flask and Flask Extensions
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS

# Database
import mysql.connector

# File System and PDF Processing
import os
import fitz  # PyMuPDF

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# File Storage Configuration
UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the uploads directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Database Configuration
db_config = {
    'host': 'localhost',
    'user': 'root',  
    'password': 'admin123',  
    'database': 'volleyball_plays'  
}

###############################################################################
# Database Helpers
###############################################################################
def get_db_connection():
    """Create and return a database connection."""
    return mysql.connector.connect(**db_config)

###############################################################################
# Helper Functions
###############################################################################
def generate_pdf_thumbnail(pdf_path, thumbnail_path):
    """
    Generate a thumbnail for the first page of a PDF, focusing on the court area.
    
    Args:
        pdf_path (str): Path to the PDF file
        thumbnail_path (str): Path where the thumbnail should be saved
    """
    try:
        print(f"Generating thumbnail for: {pdf_path}")  # Debugging
        print(f"Saving thumbnail to: {thumbnail_path}")  # Debugging

        pdf_document = fitz.open(pdf_path)
        page = pdf_document[0]  # Get the first page

        # Define the bounding box for the court area (adjust coordinates as needed)
        # Coordinates are in points (1/72 inch), with (0, 0) at the top-left corner
        court_bbox = fitz.Rect(40, 200, 555, 822)  # Example coordinates, adjust as needed

        # Crop the page to the court area
        page.set_cropbox(court_bbox)

        # Render the cropped page to an image
        pix = page.get_pixmap()
        pix.save(thumbnail_path)  # Save the image as a PNG

        pdf_document.close()
        print(f"Thumbnail generated successfully: {thumbnail_path}")  # Debugging
    except Exception as e:
        print(f"Error generating thumbnail: {e}")

###############################################################################
# General Routes
###############################################################################
@app.route('/')
def index():
    """Serve the main HTML page."""
    return render_template('index.html')

###############################################################################
# File Upload and Management Routes
###############################################################################
@app.route('/uploads', methods=['POST'])
def upload_file():
    """
    Upload a PDF file and categorize it.
    
    Returns:
        JSON response with upload status
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        category = request.form.get('category', 'Uncategorized')  # Default to 'Uncategorized'
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Handle PDF files
        if file and file.filename.endswith('.pdf'):
            # Ensure the category folder exists
            category_path = os.path.join(app.config['UPLOAD_FOLDER'], category)
            if not os.path.exists(category_path):
                os.makedirs(category_path)

            # Generate a unique filename for the PDF
            original_filename = os.path.splitext(file.filename)[0]
            extension = os.path.splitext(file.filename)[1]
            unique_filename = original_filename + extension
            counter = 1

            # Check for duplicates in the category folder
            while os.path.exists(os.path.join(category_path, unique_filename)):
                unique_filename = f"{original_filename}({counter}){extension}"
                counter += 1

            # Save the PDF file in the category folder
            file_path = os.path.join(category_path, unique_filename)
            file.save(file_path)
            print(f"PDF saved: {file_path}")  # Debugging

            # Generate a thumbnail for the PDF
            thumbnail_name = unique_filename.replace('.pdf', '_thumb.png')
            thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], thumbnail_name)  # Save thumbnails in the uploads folder
            print(f"Thumbnail path: {thumbnail_path}")  # Debugging

            generate_pdf_thumbnail(file_path, thumbnail_path)

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

            return jsonify({"message": "File uploaded successfully", "file_id": file_id, "thumbnail_name": thumbnail_name}), 200

        # Handle unsupported file types
        else:
            return jsonify({"error": "Invalid file type. Only PDFs are allowed."}), 400

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/uploads', methods=['GET'])
def get_files():
    """
    Fetch all uploaded files.
    
    Returns:
        JSON list of all files with their metadata
    """
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

@app.route('/uploads/<int:id>', methods=['GET'])
def download_file(id):
    """
    Download a file by its ID.
    
    Args:
        id (int): File ID
        
    Returns:
        File for download or error message
    """
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

@app.route('/uploads/<int:id>', methods=['DELETE'])
def delete_file(id):
    """
    Delete a file by its ID.
    
    Args:
        id (int): File ID
        
    Returns:
        JSON response with deletion status
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch the file path and file name from the database
        cursor.execute("SELECT file_path, file_name FROM plays WHERE id = %s", (id,))
        result = cursor.fetchone()

        if result:
            file_path = result[0]
            file_name = result[1]

            # Delete the PDF file
            if os.path.exists(file_path):
                os.remove(file_path)  # Delete the PDF file
                print(f"Deleted PDF: {file_path}")  # Debugging

            # Construct the thumbnail path
            thumbnail_name = file_name.replace('.pdf', '_thumb.png')
            thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], thumbnail_name)

            # Delete the thumbnail file
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)  # Delete the thumbnail
                print(f"Deleted Thumbnail: {thumbnail_path}")  # Debugging

            # Delete the record from the database
            cursor.execute("DELETE FROM plays WHERE id = %s", (id,))
            conn.commit()
            cursor.close()
            conn.close()

            return jsonify({"message": "File and thumbnail deleted successfully"}), 200
        else:
            cursor.close()
            conn.close()
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/uploads/category/<string:category_name>', methods=['GET'])
def get_files_by_category(category_name):
    """
    Get files by category.
    
    Args:
        category_name (str): Category name or 'All'
        
    Returns:
        JSON list of files in the category
    """
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

@app.route('/thumbnails/<filename>', methods=['GET'])
def get_thumbnail(filename):
    """
    Serve a thumbnail image.
    
    Args:
        filename (str): Thumbnail filename
        
    Returns:
        Thumbnail image or error message
    """
    try:
        thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        print(f"Requested thumbnail: {filename}")  # Debugging
        print(f"Resolved path: {thumbnail_path}")  # Debugging

        if os.path.exists(thumbnail_path):
            return send_file(thumbnail_path, mimetype='image/png')
        else:
            print(f"Thumbnail not found: {thumbnail_path}")  # Debugging
            return jsonify({"error": "Thumbnail not found"}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

###############################################################################
# Category Management Routes
###############################################################################
@app.route('/categories', methods=['GET'])
def get_categories():
    """
    List all categories.
    
    Returns:
        JSON list of all categories
    """
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
    
@app.route('/categories', methods=['POST'])
def create_category():
    """
    Create a new category.
    
    Returns:
        JSON response with creation status
    """
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
    
@app.route('/categories/<string:category_name>', methods=['DELETE'])
def delete_category(category_name):
    """
    Delete a category and its contents.
    
    Args:
        category_name (str): Name of category to delete
        
    Returns:
        JSON response with deletion status
    """
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

            # Remove the category from the database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM categories WHERE name = %s", (category_name,))
            conn.commit()
            cursor.close()
            conn.close()

            return jsonify({"message": "Category deleted successfully"}), 200
        else:
            return jsonify({"error": "Category not found"}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)
