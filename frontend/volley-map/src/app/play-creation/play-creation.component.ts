import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostListener } from '@angular/core';
import html2pdf from 'html2pdf.js';
import { Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ColorPickerModule } from 'ngx-color-picker';
import { routes } from '../app.routes';


@Component({
  selector: 'app-play-creation',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, HttpClientModule, RouterModule, ColorPickerModule],
  templateUrl: './play-creation.component.html',
  styleUrls: ['./play-creation.component.scss'],
  encapsulation: ViewEncapsulation.Emulated, // Ensure styles are encapsulated

})
export class PlayCreationComponent {
  playTitle: string = 'Untitled Play'; // Default play title
  annotation: string = '';
  annotations: string[] = [];
  courtShapes: any[] = []; // Store shapes added to the court
  showZones: boolean = false; // Track whether zones are visible


  ngOnInit(): void {
    console.log('Play Creation Component Initialized');
  }


  constructor(private http: HttpClient) {}

  shapes = [
    { type: 'setter', label: 'S' },
    { type: 'libero', label: 'L' },
    { type: 'oh1', label: 'OH 1' },
    { type: 'oh2', label: 'OH 2' },
    { type: 'm1', label: 'M1' },
    { type: 'm2', label: 'M2' },
    { type: 'opposite', label: 'OPP' },
    { type: 'x', label: ' ' }, // New shape X
    { type: 'o', label: ' ' }, // New shape O
  ];

  addShape(shape: any): void {
    console.log('Shape clicked:', shape); // Debugging
    console.log('Shape type:', shape.type);
  
    // Add a new shape to the court at a default position
    this.courtShapes.push({
      type: shape.type,
      label: shape.label, // Include the label property
      position: { x: 250, y: 350 }, // Default position
      zIndex: 1000,
      color: shape.type === 'x' || shape.type === 'o' ? null : '#1e1e1e', // No color for X and O
    });
  
    console.log('Court shapes:', this.courtShapes); // Debugging
  }

  changeShapeColor(event: any): void {
    if (this.selectedShape) {
      const newColor = event.target.value; // Get the selected color from the color picker
      this.selectedShape.color = newColor; // Update the color property of the selected shape
  
      // Reassign the courtShapes array to trigger Angular's change detection
      this.courtShapes = [...this.courtShapes];
  
    }
  }

  updateShapeColor(newColor: string): void {
    if (this.selectedShape) {
      // Update the color property for all shapes except X and O
      if (this.selectedShape.type !== 'x' && this.selectedShape.type !== 'o') {
        this.selectedShape.color = newColor;
      }
  
      // Trigger Angular's change detection
      this.courtShapes = [...this.courtShapes];
    }
  }


  // Custom Tooltip
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedShape: any = null;

  onRightClick(event: MouseEvent, shape: any): void {
    event.preventDefault(); // Prevent the default browser context menu
  
    // Get the bounding rectangle of the selected shape
    const shapeElement = event.target as HTMLElement;
    const shapeRect = shapeElement.getBoundingClientRect();
  
    // Calculate the position of the context menu (10px right and 10px above the shape)
    this.contextMenuPosition = {
      x: shapeRect.left + shapeRect.width + 10, // 10px to the right of the shape
      y: shapeRect.top - 10, // 10px above the shape
    };
  
    this.contextMenuVisible = true; // Show the context menu
    this.selectedShape = shape; // Store the selected shape
    console.log('Context menu position:', this.contextMenuPosition); // Debugging
  }

  deleteShapeFromContextMenu(): void {
    if (this.selectedShape) {
      const shapeIndex = this.courtShapes.indexOf(this.selectedShape);
      if (shapeIndex !== -1) {
        this.courtShapes.splice(shapeIndex, 1); // Remove the shape from the array
      }
      this.contextMenuVisible = false; // Hide the context menu
      this.selectedShape = null; // Clear the selected shape
    }
  }

@HostListener('document:click', ['$event'])
hideContextMenu(event: MouseEvent): void {
  const target = event.target as HTMLElement;

  // Check if the click is inside the color picker container
  if (target.closest('.color-picker-container')) {
    return; // Do nothing if the click is inside the color picker
  }

  this.contextMenuVisible = false; // Hide the context menu otherwise
}


  addAnnotation(): void {
    if (this.annotation) {
      this.annotations.push(this.annotation);
      this.annotation = '';
    }
  }

  toggleZones(): void {
    this.showZones = !this.showZones; // Toggle the zone view
  }

  onDragMoved(event: any, player: any): void {
    const courtRect = (
      event.source.element.nativeElement.parentElement as HTMLElement
    ).getBoundingClientRect();
    const dragRect = event.source.element.nativeElement.getBoundingClientRect();
  }

  onDragEnded(event: any, shape: any): void {
    const courtElement = event.source.element.nativeElement
      .parentElement as HTMLElement;
    const courtRect = courtElement.getBoundingClientRect();
    const dragRect = event.source.element.nativeElement.getBoundingClientRect();

    const newX = dragRect.left - courtRect.left;
    const newY = dragRect.top - courtRect.top;

    shape.position.x = newX;
    shape.position.y = newY;

    shape.zIndex = Math.max(...this.courtShapes.map((s) => s.zIndex)) + 1;

    // Reset the drag position to avoid visual glitches
    event.source.reset();

    console.log(`Shape dropped at: (${newX}, ${newY})`);
  }

  
  generatePDF(category: string): void {
    const courtElement = document.querySelector('.court-container') as HTMLElement;
  
    if (!courtElement) {
      console.error('Court container not found!');
      return;
    }
  
    // Dynamically import html2pdf.js
    import('html2pdf.js').then((html2pdf) => {
      // Create a wrapper for the PDF content
      const pdfContent = document.createElement('div');
      pdfContent.style.width = '210mm'; // A4 width
      pdfContent.style.height = 'auto'; // Allow height to grow for multiple pages
      pdfContent.style.padding = '20mm'; // Add padding for margins
      pdfContent.style.boxSizing = 'border-box';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
  
      // Add the play title at the top
      const titleElement = document.createElement('h1');
      titleElement.textContent = this.playTitle;
      titleElement.style.textAlign = 'center';
      titleElement.style.marginBottom = '10mm';
      pdfContent.appendChild(titleElement);
  
      // Add the category below the title
      const categoryElement = document.createElement('h3');
      categoryElement.textContent = `Category: ${category}`;
      categoryElement.style.textAlign = 'center';
      categoryElement.style.marginBottom = '20mm';
      pdfContent.appendChild(categoryElement);
  
      // Clone the court element and add it to the PDF content
      const courtClone = courtElement.cloneNode(true) as HTMLElement;
      courtClone.style.margin = '0 auto'; // Center the court
      courtClone.style.width = '100%'; // Scale to fit the page
      courtClone.style.height = 'auto'; // Maintain aspect ratio
      pdfContent.appendChild(courtClone);
  
      // Add a second page for annotations
      const annotationsPage = document.createElement('div');
      annotationsPage.style.width = '210mm'; // A4 width
      annotationsPage.style.height = '297mm'; // A4 height
      annotationsPage.style.padding = '20mm'; // Add padding for margins
      annotationsPage.style.boxSizing = 'border-box';
      annotationsPage.style.fontFamily = 'Arial, sans-serif';
  
      // Add the play title at the top of the annotations page
      const annotationsTitle = document.createElement('h1');
      annotationsTitle.textContent = this.playTitle;
      annotationsTitle.style.textAlign = 'center';
      annotationsTitle.style.marginBottom = '20mm'; // Add space below the title
      annotationsPage.appendChild(annotationsTitle);
  
      // Add annotations
      const annotationsList = document.createElement('div');
      annotationsList.style.fontSize = '12pt';
      annotationsList.style.lineHeight = '1.5';
      annotationsList.style.textAlign = 'left'; // Align annotations to the left
      annotationsList.style.margin = '0 auto'; // Center the annotations horizontally
      annotationsList.style.width = '80%'; // Limit the width for better readability
      this.annotations.forEach((annotation, index) => {
        const annotationItem = document.createElement('p');
        annotationItem.textContent = `${index + 1}. ${annotation}`;
        annotationsList.appendChild(annotationItem);
      });
      annotationsPage.appendChild(annotationsList);
  
      // Append the annotations page to the PDF content
      pdfContent.appendChild(annotationsPage);
  
      // Configure html2pdf.js options
      const options = {
        margin: 0,
        filename: `${this.playTitle.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
  
      // Generate the PDF and upload it to the backend
      html2pdf.default().set(options).from(pdfContent).toPdf().outputPdf('blob').then((pdfBlob: Blob) => {
        // Use the play title as the filename
        const filename = `${this.playTitle.replace(/\s+/g, '_')}.pdf`;
  
        // Create FormData to send the PDF and category to the backend
        const formData = new FormData();
        formData.append('file', pdfBlob, filename);
        formData.append('category', category);
  
        // Send the PDF to the backend
        this.http.post('http://127.0.0.1:5000/uploads', formData).subscribe(
          () => {
            alert('PDF uploaded successfully!');
            this.annotations = []; // Clear annotations after saving
          },
          (error: any) => {
            console.error('Error uploading PDF:', error);
          }
        );
      }).catch((error: any) => {
        console.error('Error generating PDF:', error);
      });
    }).catch((error) => {
      console.error('Error loading html2pdf.js:', error);
    });
  }
  
}