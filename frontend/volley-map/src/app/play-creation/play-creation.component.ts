import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-play-creation',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, HttpClientModule],
  templateUrl: './play-creation.component.html',
  styleUrls: ['./play-creation.component.scss']
})
export class PlayCreationComponent {
  players = [
    { name: '1', position: { x: 50, y: 50 }, zIndex: 1 },
    { name: '2', position: { x: 150, y: 50 }, zIndex: 1 },
    { name: '3', position: { x: 250, y: 50 }, zIndex: 1 },
    { name: '4', position: { x: 50, y: 150 }, zIndex: 1 },
    { name: '5', position: { x: 150, y: 150 }, zIndex: 1 },
    { name: '6', position: { x: 250, y: 150 }, zIndex: 1 }
  ];

  annotation: string = '';
  annotations: string[] = [];
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
  const courtRect = (event.source.element.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
  const dragRect = event.source.element.nativeElement.getBoundingClientRect();

  let newX = event.pointerPosition.x - courtRect.left - dragRect.width / 2;
  let newY = event.pointerPosition.y - courtRect.top - dragRect.height / 2;




  // Temporarily set a high zIndex while dragging
  player.zIndex = Math.max(...this.players.map(p => p.zIndex)) + 1;
}

onDragEnded(event: any, player: any): void {
  const courtRect = (event.source.element.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
  const dragRect = event.source.element.nativeElement.getBoundingClientRect();



  // Update zIndex to ensure the dragged item stays on top after dropping
  player.zIndex = Math.max(...this.players.map(p => p.zIndex)) + 1;
}

  generatePDF(category: string): void {
    const doc = new jsPDF();
  
    // PDF dimensions
    const pdfWidth = 210;
    const pdfHeight = 297; 
    const margin = 10; 
  
    // Court dimensions (scaled to fit within the PDF)
    const courtWidth = 180; 
    const courtHeight = 270; 
    const courtAspectRatio = 500 / 750; 
  
    // Adjust court dimensions to maintain aspect ratio
    let scaledCourtWidth = courtWidth;
    let scaledCourtHeight = courtWidth / courtAspectRatio;
  
    if (scaledCourtHeight > courtHeight) {
      scaledCourtHeight = courtHeight;
      scaledCourtWidth = courtHeight * courtAspectRatio;
    }
  
    // Court position on the PDF (centered)
    const courtX = (pdfWidth - scaledCourtWidth) / 2;
    const courtY = margin;
  
    // Add title
    doc.setFontSize(16);
    doc.text('Volleyball Play', pdfWidth / 2, margin / 2, { align: 'center' });
  
    // Draw court
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(courtX, courtY, scaledCourtWidth, scaledCourtHeight);
  
    // Scale players' positions to fit the scaled court
    const scaleX = scaledCourtWidth / 500; 
    const scaleY = scaledCourtHeight / 750; 
  
    this.players.forEach((player) => {
      const x = courtX + player.position.x * scaleX;
      const y = courtY + player.position.y * scaleY;
  
      // Draw player as a circle
      doc.setFillColor(0, 0, 255);
      doc.circle(x, y, 3, 'F'); 
      
      // Add player name
      doc.setFontSize(10);
      doc.text(player.name, x + 5, y + 2);
    });
  
    // Add category at the bottom of the first page
    const categoryY = courtY + scaledCourtHeight + margin;
    doc.setFontSize(12);
    doc.text(`Category: ${category}`, margin, categoryY);
  
    // Add a new page for annotations
    doc.addPage();
  
    // Add title for annotations
    doc.setFontSize(16);
    doc.text('Annotations', pdfWidth / 2, margin, { align: 'center' });
  
    // Add annotations
    let annotationY = margin + 10; // Start below the title
    doc.setFontSize(12);
    this.annotations.forEach((annotation, index) => {
      if (annotationY > pdfHeight - margin) {
        // If the current page is full, add a new page
        doc.addPage();
        annotationY = margin; // Reset Y position for the new page
      }
      doc.text(`${index + 1}. ${annotation}`, margin, annotationY);
      annotationY += 10; // Line spacing
    });
  
    // Convert PDF to Blob
    const pdfBlob = doc.output('blob');
  
    // Send PDF to backend
    const formData = new FormData();
    formData.append('file', pdfBlob, 'volleyball_play.pdf');
    formData.append('category', category);
  
    this.http.post('http://127.0.0.1:5000/uploads', formData).subscribe(
      () => {
        alert('PDF saved successfully!');
        this.annotations = []; // Clear annotations after saving
      },
      (error) => console.error('Error saving PDF:', error)
    );
  }
}