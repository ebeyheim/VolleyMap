# VolleyMap

VolleyMap is a digital whiteboard and play management system designed specifically for volleyball coaches and players. It aims to simplify the process of creating, organizing, and sharing volleyball plays. The project is currently in development, with some features already implemented and more planned for future releases.

## Current Features

### PDF Database System:
- Upload PDF files (e.g., play diagrams, strategies) to the system.
- Store uploaded files in a MySQL database with metadata (e.g., file name, upload date).
- View a list of uploaded files with unique IDs and filenames.
- Download or delete files directly from the interface.
- Web interface built with HTML, Bootstrap, and JavaScript.
- Backend powered by Flask for handling file uploads, downloads, and database interactions.
- Categorize plays by type (e.g., offensive, defensive, serve-receive).

### Play Creation Tool:
- Implement a drag-and-drop interface for creating volleyball plays.
- Use Angular CDK to provide a robust and interactive design experience.
- Allow users to add player positions, movements, and annotations directly on a digital court.

  
## Planned Features

### Toolbar
- Toolbar with premade objects the user can drag-and-drop onto the court
- Item deletion feature
- Colors
- Editable text

### Play Organization:
- Add tags and descriptions for better searchability and organization.
- Icons/Images for categories

### Enhanced Collaboration:
- Enable sharing of plays with team members or other coaches.
- Provide options for exporting plays as PDFs or sharing via links.
Advanced Features:
- Storage of different file types to allow for editing.

## How to Use
#### Upload PDFs:
1. Navigate to the "PDF Database System" section.
2. Use the upload form to add PDF files to the system.
3. Uploaded files will appear in the table with their unique ID and filename.
#### Manage Files:
1. Download files by clicking the "Download" button.
2. Delete files by clicking the "Delete" button.
#### Create Plays
1. Drag objects around court
2. Add annotations
3. Select category to save file to
4. Save file as PDF
