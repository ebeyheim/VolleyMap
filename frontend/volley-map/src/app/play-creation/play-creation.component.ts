import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragMove, CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostListener } from '@angular/core';
import html2pdf from 'html2pdf.js';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ColorPickerModule } from 'ngx-color-picker';
import { Router } from '@angular/router';

@Component({
  selector: 'app-play-creation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    HttpClientModule,
    RouterModule,
    ColorPickerModule,
  ],
  templateUrl: './play-creation.component.html',
  styleUrls: ['./play-creation.component.scss'],
  encapsulation: ViewEncapsulation.Emulated, // Ensure styles are encapsulated
})
export class PlayCreationComponent {
  playTitle: string = ''; // Default play title
  annotation: string = '';
  annotations: string[] = [];
  courtShapes: any[] = []; // Store shapes added to the court
  showZones: boolean = false; // Track whether zones are visible
  categories: string[] = []; // Store the categories
  Math = Math; // Expose Math for use in the template

  ngOnInit(): void {
    this.fetchCategories(); // Fetch categories when the component initializes
  }

  navigateToSavedMaps(): void {
    this.router.navigate(['/saved-maps']);
  }

  fetchCategories(): void {
    this.http.get<string[]>('http://127.0.0.1:5000/categories').subscribe(
      (response) => {
        this.categories = response; // Store the categories
        console.log('Categories fetched:', this.categories); // Debugging
      },
      (error) => {
        console.error('Error fetching categories:', error);
      }
    );
  }

  constructor(private http: HttpClient, private router: Router) {}

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
    { type: 'volleyball', label: '' }, // New volleyball shape
    { type: 'arrow', label: '' }, // New arrow shape
  ];

  // Track which point is being dragged (start or end)
  dragPointType: string | null = null;
  initialArrowDragPosition = { x: 0, y: 0 };
  previousDelta = { x: 0, y: 0 };

  // Method called when starting to drag an anchor point
  startDragAnchorPoint(
    event: MouseEvent,
    shape: any,
    pointType: 'startPoint' | 'endPoint'
  ): void {
    event.stopPropagation(); // Prevent event bubbling
    this.dragPointType = pointType;
    shape.isSelected = true;
  }

  // Method called when dragging an anchor point
  // Method called when dragging an anchor point
  // Method called when dragging an anchor point
  onAnchorPointDrag(event: CdkDragMove, shape: any): void {
    if (!this.dragPointType || !shape) return;

    // Get court container position
    const courtElement = document.querySelector(
      '.court-container'
    ) as HTMLElement;
    const courtRect = courtElement.getBoundingClientRect();

    // Calculate new position based on the pointer position
    const newX = event.pointerPosition.x - courtRect.left;
    const newY = event.pointerPosition.y - courtRect.top;

    // Update the appropriate anchor point
    if (this.dragPointType === 'startPoint') {
      shape.startPoint = { x: newX, y: newY };
    } else if (this.dragPointType === 'endPoint') {
      shape.endPoint = { x: newX, y: newY };
    }

    // Immediately reset the element transform to prevent visual jumping
    const element = event.source.element.nativeElement;
    element.style.transform = 'none';

    // Reset the drag source position
    event.source.reset();

    // Update the courtShapes array to trigger change detection
    this.courtShapes = [...this.courtShapes];
  }

  // Method called when anchor point drag ends
  endDragAnchorPoint(event: CdkDragEnd, shape: any): void {
    this.dragPointType = null;

    // Reset the drag position to avoid visual glitches
    event.source.reset();
  }

  // Method to handle starting drag of entire arrow
  startEntireArrowDrag(event: CdkDragStart, arrow: any): void {
    if (!arrow || arrow.type !== 'arrow') return;

    // Reset previous delta when starting a new drag
    this.previousDelta = { x: 0, y: 0 };
  }

  // Method called when entire arrow drag ends
  endEntireArrowDrag(event: CdkDragEnd, arrow: any): void {
    if (!arrow || arrow.type !== 'arrow') return;

    // Reset the drag position to avoid visual glitches
    event.source.reset();

    // Reset previous delta for next drag session
    this.previousDelta = { x: 0, y: 0 };
  }

  // Updated moveEntireArrow method
  moveEntireArrow(event: CdkDragMove, arrow: any): void {
    if (!arrow || arrow.type !== 'arrow') return;

    // Calculate the delta since last drag event
    const currentDelta = {
      x: event.distance.x - this.previousDelta.x,
      y: event.distance.y - this.previousDelta.y,
    };

    // Update previous delta for next calculation
    this.previousDelta = {
      x: event.distance.x,
      y: event.distance.y,
    };

    // Move both anchor points by the current delta (not cumulative)
    arrow.startPoint.x += currentDelta.x;
    arrow.startPoint.y += currentDelta.y;
    arrow.endPoint.x += currentDelta.x;
    arrow.endPoint.y += currentDelta.y;

    // Update the courtShapes array to trigger change detection
    this.courtShapes = [...this.courtShapes];
  }

  // Calculate the length of the arrow
  getArrowLength(arrow: any): number {
    if (!arrow) return 0;

    const dx = arrow.endPoint.x - arrow.startPoint.x;
    const dy = arrow.endPoint.y - arrow.startPoint.y;

    // Use Pythagorean theorem to get the length
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate the angle of the arrow in degrees
  getArrowAngle(arrow: any): number {
    if (!arrow) return 0;

    const dx = arrow.endPoint.x - arrow.startPoint.x;
    const dy = arrow.endPoint.y - arrow.startPoint.y;

    // Calculate angle in degrees (0 degrees points right)
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  addShape(shape: any): void {
    console.log('Shape clicked:', shape);
    console.log('Shape type:', shape.type);

    if (shape.type === 'arrow') {
      // Add a new arrow with two anchor points
      this.courtShapes.push({
        type: shape.type,
        label: shape.label,
        // Set start and end points instead of a single position
        startPoint: { x: 200, y: 350 },
        endPoint: { x: 300, y: 350 },
        zIndex: 1000,
        color: '#1e1e1e',
        isSelected: false,
      });
    } else {
      // Handle other shapes as before
      this.courtShapes.push({
        type: shape.type,
        label: shape.label,
        position: { x: 250, y: 350 },
        zIndex: 1000,
        color: shape.type === 'x' || shape.type === 'o' ? null : '#1e1e1e',
        image: shape.type === 'volleyball' ? 'logo.png' : null,
      });
    }

    console.log('Court shapes:', this.courtShapes);
  }

  changeShapeColor(event: any): void {
    if (this.selectedShape) {
      const newColor = event.target.value; // Get the selected color from the color picker
      this.selectedShape.color = newColor; // Update the color property of the selected shape

      // Reassign the courtShapes array to trigger Angular's change detection
      this.courtShapes = [...this.courtShapes];
    }
  }

  // In your updateShapeColor method
  updateShapeColor(newColor: string): void {
    if (this.selectedShape) {
      // Update the color property for all shapes including arrows
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
    import('html2pdf.js')
      .then((html2pdf) => {
        // Create a wrapper for the PDF content
        const pdfContent = document.createElement('div');
        pdfContent.style.width = '210mm'; // A4 width
        pdfContent.style.height = 'auto';
        pdfContent.style.padding = '20mm';
        pdfContent.style.boxSizing = 'border-box';
        pdfContent.style.fontFamily = 'Arial, sans-serif';
  
        // Add title and category as before
        const titleElement = document.createElement('h1');
        titleElement.textContent = this.playTitle;
        titleElement.style.textAlign = 'center';
        titleElement.style.marginBottom = '10mm';
        pdfContent.appendChild(titleElement);
  
        const categoryElement = document.createElement('h3');
        categoryElement.textContent = `Category: ${category}`;
        categoryElement.style.textAlign = 'center';
        categoryElement.style.marginBottom = '20mm';
        pdfContent.appendChild(categoryElement);
  
        // Clone the court element
        const courtClone = courtElement.cloneNode(true) as HTMLElement;
        
        // Remove anchor points and arrow bodies
        const anchorPoints = courtClone.querySelectorAll('.anchor-point');
        anchorPoints.forEach(anchorPoint => {
          anchorPoint.remove();
        });
        
        const arrowBodies = courtClone.querySelectorAll('.arrow-body');
        arrowBodies.forEach(arrowBody => {
          arrowBody.remove();
        });
        
        // Fix arrow alignment in PDF - create new SVG elements instead of adjusting existing ones
        const arrowSvgs = courtClone.querySelectorAll('.arrow-svg');
        arrowSvgs.forEach(arrowSvg => {
          const svgElement = arrowSvg as SVGElement;
          const line = svgElement.querySelector('line');
          
          if (line) {
            // Get current coordinates
            const x1 = parseFloat(line.getAttribute('x1') || '0');
            const y1 = parseFloat(line.getAttribute('y1') || '0');
            const x2 = parseFloat(line.getAttribute('x2') || '0');
            const y2 = parseFloat(line.getAttribute('y2') || '0');
            const color = line.getAttribute('stroke') || '#000000';
            
            // Create a new div with the correct arrow positioning
            const arrowDiv = document.createElement('div');
            arrowDiv.style.position = 'absolute';
            arrowDiv.style.left = '0';
            arrowDiv.style.top = '0';
            arrowDiv.style.width = '100%';
            arrowDiv.style.height = '100%';
            arrowDiv.style.zIndex = svgElement.style.zIndex;
            
            // Create a new SVG element with corrected coordinates
            const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            newSvg.setAttribute('width', '700');
            newSvg.setAttribute('height', '900');
            newSvg.style.position = 'absolute';
            
            // Create the marker definition
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', 'pdf-arrowhead-' + Math.random().toString(36).substr(2, 9));
            marker.setAttribute('markerWidth', '10');
            marker.setAttribute('markerHeight', '7');
            marker.setAttribute('refX', '9');
            marker.setAttribute('refY', '3.5');
            marker.setAttribute('orient', 'auto');
            
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
            polygon.setAttribute('fill', color);
            
            marker.appendChild(polygon);
            defs.appendChild(marker);
            newSvg.appendChild(defs);
            
            // Create the line with adjusted coordinates (shifted right by 50px)
            const newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            newLine.setAttribute('x1', (x1 + 20).toString());
            newLine.setAttribute('y1', (y1 + 34).toString());
            newLine.setAttribute('x2', (x2 + 20).toString());
            newLine.setAttribute('y2', (y2 + 34).toString());
            newLine.setAttribute('stroke', color);
            newLine.setAttribute('stroke-width', '2');
            newLine.setAttribute('marker-end', 'url(#' + marker.getAttribute('id') + ')');
            
            newSvg.appendChild(newLine);
            arrowDiv.appendChild(newSvg);
            
            // Replace the original SVG with our new version
            svgElement.parentNode?.replaceChild(arrowDiv, svgElement);
          }
        });
  
        courtClone.style.margin = '0 auto';
        courtClone.style.width = '100%';
        courtClone.style.height = 'auto';
        pdfContent.appendChild(courtClone);
  
        // Rest of your PDF generation code remains the same
        // (annotations page, html2pdf options, etc.)
        
        // Add a second page for annotations
        const annotationsPage = document.createElement('div');
        // ... rest of your annotations page code ...
        
        // Continue with PDF generation and upload
        const options = {
          margin: 0,
          filename: `${this.playTitle.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };
  
        html2pdf
          .default()
          .set(options)
          .from(pdfContent)
          .toPdf()
          .outputPdf('blob')
          .then((pdfBlob: Blob) => {
            // Handle the PDF blob as before
            const filename = `${this.playTitle.replace(/\s+/g, '_')}.pdf`;
            const formData = new FormData();
            formData.append('file', pdfBlob, filename);
            formData.append('category', category);
            
            this.http.post('http://127.0.0.1:5000/uploads', formData).subscribe(
              () => {
                alert('PDF uploaded successfully!');
                this.annotations = [];
              },
              (error: any) => {
                console.error('Error uploading PDF:', error);
              }
            );
          });
      })
      .catch((error) => {
        console.error('Error loading html2pdf.js:', error);
      });
  }
  
  
  
  
}
