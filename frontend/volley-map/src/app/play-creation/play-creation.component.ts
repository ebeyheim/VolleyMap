import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';


@Component({
  selector: 'app-play-creation',
  standalone: true, // Declare this as a standalone component
  imports: [CommonModule, FormsModule, DragDropModule, HttpClientModule], // Import necessary modules here
  templateUrl: './play-creation.component.html',
  styleUrls: ['./play-creation.component.scss']
})
export class PlayCreationComponent {
  players = [
    { name: 'Player 1', position: { x: 50, y: 50 } },
    { name: 'Player 2', position: { x: 150, y: 50 } },
    { name: 'Player 3', position: { x: 250, y: 50 } },
    { name: 'Player 4', position: { x: 50, y: 150 } },
    { name: 'Player 5', position: { x: 150, y: 150 } },
    { name: 'Player 6', position: { x: 250, y: 150 } }
  ];

  annotation: string = '';
  annotations: string[] = [];

  constructor(private http: HttpClient) {}

  addAnnotation(): void {
    if (this.annotation) {
      this.annotations.push(this.annotation);
      this.annotation = '';
    }
  }

  onDrop(event: any): void {
    const player = this.players[event.previousIndex];
    const dropPoint = event.event; // Get the drop event details
    player.position = { x: dropPoint.offsetX, y: dropPoint.offsetY }; // Update player position
    console.log('Player dropped:', player);
  }

  savePlay(): void {
    const playData = {
      players: this.players,
      annotations: this.annotations
    };

    this.http.post('http://127.0.0.1:5000/plays', playData).subscribe(
      () => alert('Play saved successfully!'),
      (error) => console.error('Error saving play:', error)
    );
  }

  generatePDF(category: string): void {
    const doc = new jsPDF();
  
    // Add title
    doc.setFontSize(16);
    doc.text('Volleyball Play', 10, 10);
  
    // Draw court
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(10, 20, 180, 90); // Court rectangle
  
    // Add players
    this.players.forEach((player) => {
      const x = 10 + player.position.x / 3; // Scale positions to fit PDF
      const y = 20 + player.position.y / 3;
      doc.setFillColor(0, 0, 255);
      doc.circle(x, y, 3, 'F'); // Draw player as a circle
      doc.text(player.name, x + 5, y + 2); // Add player name
    });
  
    // Add annotations
    doc.setFontSize(12);
    this.annotations.forEach((annotation, index) => {
      doc.text(`${index + 1}. ${annotation}`, 10, 120 + index * 10);
    });
  
    // Convert PDF to Blob
    const pdfBlob = doc.output('blob');
  
    // Send PDF to backend
    const formData = new FormData();
    formData.append('file', pdfBlob, 'volleyball_play.pdf');
    formData.append('category', category); // Include the category
  
    this.http.post('http://127.0.0.1:5000/uploads', formData).subscribe(
      () => alert('PDF saved successfully!'),
      (error) => console.error('Error saving PDF:', error)
    );
  }
}