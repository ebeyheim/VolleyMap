import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import { HostListener } from '@angular/core';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-play-creation',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, HttpClientModule],
  templateUrl: './play-creation.component.html',
  styleUrls: ['./play-creation.component.scss'],
})
export class PlayCreationComponent {
  playTitle: string = 'Untitled Play'; // Default play title
  annotation: string = '';
  annotations: string[] = [];

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

  courtShapes: any[] = []; // Store shapes added to the court

  addShape(shape: any): void {
    console.log('Shape clicked:', shape); // Debugging
    console.log('Shape type:', shape.type);
    // Add a new shape to the court at a default position
    this.courtShapes.push({
      type: shape.type,
      label: shape.label, // Include the label property
      position: { x: 250, y: 350 }, // Default position
      zIndex: 1000,
    });
    console.log('Court shapes:', this.courtShapes); // Debugging
  }

  // Custom Tooltip
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedShape: any = null;

  onRightClick(event: MouseEvent, shape: any): void {
    event.preventDefault(); // Prevent the default browser context menu
    this.contextMenuVisible = true;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY }; // Set the position of the tooltip
    this.selectedShape = shape; // Store the selected shape
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

  @HostListener('document:click')
  hideContextMenu(): void {
    this.contextMenuVisible = false;
  }

  showZones: boolean = false; // Track whether zones are visible

  constructor(private http: HttpClient) {}

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
    const courtElement = document.querySelector(
      '.court-container'
    ) as HTMLElement;

    if (!courtElement) {
      console.error('Court container not found!');
      return;
    }

    // Use html2canvas to capture the court as an image
    html2canvas(courtElement, { scale: 1 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.7); // Compress image to reduce size
      const pdf = new jsPDF('portrait', 'mm', 'a4');

      // Calculate dimensions to fit the image into the PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // Leave some margin
      const imgHeight = (canvas.height / canvas.width) * imgWidth; // Maintain aspect ratio

      // Add the play title at the top of the first page
      pdf.setFontSize(16);
      pdf.text(this.playTitle, pdfWidth / 2, 10, { align: 'center' });

      // Add the court image to the PDF
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = 20; // Leave some margin below the title
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);

      // Add category at the bottom of the first page
      pdf.setFontSize(12);
      pdf.text(`Category: ${category}`, 10, pdfHeight - 10);

      // Add a new page for annotations
      pdf.addPage();

      // Add the play title at the top of the second page
      pdf.setFontSize(16);
      pdf.text(this.playTitle, pdfWidth / 2, 10, { align: 'center' });

      // Add annotations
      pdf.setFontSize(12);
      let annotationY = 20; // Start below the title
      this.annotations.forEach((annotation, index) => {
        if (annotationY > pdfHeight - 20) {
          pdf.addPage();
          pdf.setFontSize(16);
          pdf.text(this.playTitle, pdfWidth / 2, 10, { align: 'center' }); // Add title to new page
          annotationY = 20; // Reset Y position for the new page
        }
        pdf.text(`${index + 1}. ${annotation}`, 10, annotationY);
        annotationY += 10; // Line spacing
      });

      // Convert PDF to Blob
      const pdfBlob = pdf.output('blob');

      // Use the play title as the filename
      const filename = `${this.playTitle.replace(/\s+/g, '_')}.pdf`;

      // Send PDF to backend
      const formData = new FormData();
      formData.append('file', pdfBlob, filename);
      formData.append('category', category);

      this.http.post('http://127.0.0.1:5000/uploads', formData).subscribe(
        () => {
          alert('PDF saved successfully!');
          this.annotations = []; // Clear annotations after saving
        },
        (error) => console.error('Error saving PDF:', error)
      );
    });
  }
}
