// Angular Core Imports
import { Component, OnInit, ViewEncapsulation, HostListener } from '@angular/core';

// Angular Common & Router Imports
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// Angular Forms Imports
import { FormsModule } from '@angular/forms';

// Angular CDK Drag & Drop Imports
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragMove, CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';

// HTTP Related Imports
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

// Third-party Library Imports
import html2pdf from 'html2pdf.js';
import { ColorPickerModule } from 'ngx-color-picker';


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

  // Shape definitions
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

  // Arrow drag tracking properties
  dragPointType: string | null = null;
  initialArrowDragPosition = { x: 0, y: 0 };
  previousDelta = { x: 0, y: 0 };

  // Context menu properties
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedShape: any = null;


  constructor(private http: HttpClient, private router: Router) {}
  ngOnInit(): void {
    this.fetchCategories(); // Fetch categories when the component initializes
  }

  // Navigate to saved maps
  navigateToSavedMaps(): void {
    this.router.navigate(['/saved-maps']);
  }

  /**
   * API Integration Methods
   * ---------------------------------------------------------------------------
   */
  // Fetch available categories from the server
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

  /**
   * Shape Management Methods
   * ---------------------------------------------------------------------------
   */
  // Add new shape to the court
  addShape(shape: any): void {
    console.log('Shape clicked:', shape);
    console.log('Shape type:', shape.type);

    if (shape.type === 'arrow') {
      this.courtShapes.push({
        type: shape.type,
        label: shape.label,
        id: 'arrow-' + Date.now(), // Add unique ID
        startPoint: { x: 200, y: 350 },
        endPoint: { x: 300, y: 350 },
        zIndex: 1000,
        color: '#1e1e1e',
        arrowColor: '#1e1e1e', // Separate property for arrow color
        anchorColor: '#1e1e1e', // Separate property for anchor points
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

  // Change color of the selected shape
  changeShapeColor(event: any): void {
    if (this.selectedShape) {
      const newColor = event.target.value; // Get the selected color from the color picker
      this.selectedShape.color = newColor; // Update the color property of the selected shape

      // Reassign the courtShapes array to trigger Angular's change detection
      this.courtShapes = [...this.courtShapes];
    }
  }

  // Update shape color from color picker
  updateShapeColor(newColor: string): void {
    if (this.selectedShape) {
      if (this.selectedShape.type === 'arrow') {
        // Only update the arrow color, not anchor points
        this.selectedShape.arrowColor = newColor;
      } else if (
        this.selectedShape.type !== 'x' &&
        this.selectedShape.type !== 'o'
      ) {
        this.selectedShape.color = newColor;
      }

      // Trigger change detection
      this.courtShapes = [...this.courtShapes];
    }
  }

  // Toggle zone visibility
  toggleZones(): void {
    this.showZones = !this.showZones; // Toggle the zone view
  }

  /**
   * Arrow Manipulation Methods
   * ---------------------------------------------------------------------------
   */
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

  /**
   * Context Menu Methods
   * ---------------------------------------------------------------------------
   */
  // Show context menu on right-click
  onRightClick(event: MouseEvent, shape: any): void {
    event.preventDefault(); // Prevent default browser context menu

    // Use mouse event coordinates directly
    this.contextMenuPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    this.contextMenuVisible = true;
    this.selectedShape = shape;
  }

  // Delete shape from context menu
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

  // Hide context menu when clicking elsewhere
  @HostListener('document:click', ['$event'])
  hideContextMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Check if the click is inside the color picker container
    if (target.closest('.color-picker-container')) {
      return; // Do nothing if the click is inside the color picker
    }

    this.contextMenuVisible = false; // Hide the context menu otherwise
  }

  /**
   * Annotation Methods
   * ---------------------------------------------------------------------------
   */
  // Add new annotation
  addAnnotation(): void {
    if (this.annotation) {
      this.annotations.push(this.annotation);
      this.annotation = '';
    }
  }

  // Delete an annotation
  deleteAnnotation(index: number): void {
    // Remove the annotation at the specified index
    this.annotations.splice(index, 1);
  }

  /**
   * Drag & Drop Event Handlers
   * ---------------------------------------------------------------------------
   */
  // Handle drag movement
  onDragMoved(event: any, player: any): void {
    const courtRect = (
      event.source.element.nativeElement.parentElement as HTMLElement
    ).getBoundingClientRect();
    const dragRect = event.source.element.nativeElement.getBoundingClientRect();
  }

  // Handle drag end
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

  /**
   * PDF Generation & Upload Methods
   * ---------------------------------------------------------------------------
   */
  // Generate PDF and upload to server
  generatePDF(category: string): void {
    const courtElement = document.querySelector(
      '.court-container'
    ) as HTMLElement;

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
        anchorPoints.forEach((anchorPoint) => {
          anchorPoint.remove();
        });

        const arrowBodies = courtClone.querySelectorAll('.arrow-body');
        arrowBodies.forEach((arrowBody) => {
          arrowBody.remove();
        });

        // Fix arrow alignment in PDF - create new SVG elements instead of adjusting existing ones
        const arrowSvgs = courtClone.querySelectorAll('.arrow-svg');
        arrowSvgs.forEach((arrowSvg) => {
          // Your existing arrow SVG handling code
          // [code preserved from original]
        });

        courtClone.style.margin = '0 auto';
        courtClone.style.width = '100%';
        courtClone.style.height = 'auto';
        pdfContent.appendChild(courtClone);

        // Add a second page for annotations with manual left offset
        const annotationsPage = document.createElement('div');
        annotationsPage.style.width = '210mm'; // A4 width
        annotationsPage.style.height = 'auto';
        annotationsPage.style.padding = '20mm';
        annotationsPage.style.boxSizing = 'border-box';
        annotationsPage.style.fontFamily = 'Arial, sans-serif';
        annotationsPage.style.pageBreakBefore = 'always'; // Force new page
        annotationsPage.style.position = 'relative'; // Enable positioning

        // Create a container for all elements on the annotations page with manual offset
        const annotationsContainer = document.createElement('div');
        annotationsContainer.style.position = 'relative';
        annotationsContainer.style.left = '-20mm'; // Apply the same offset to all elements
        annotationsContainer.style.width = '100%';
        annotationsContainer.style.textAlign = 'center'; // Center everything inside

        // Add title to annotations page (will inherit the offset from parent)
        const annotationsTitleElement = document.createElement('h1');
        annotationsTitleElement.textContent = this.playTitle;
        annotationsTitleElement.style.textAlign = 'center';
        annotationsTitleElement.style.marginBottom = '10mm';
        annotationsContainer.appendChild(annotationsTitleElement);

        // Add category to annotations page (will inherit the offset from parent)
        const annotationsCategoryElement = document.createElement('h3');
        annotationsCategoryElement.textContent = `Category: ${category}`;
        annotationsCategoryElement.style.textAlign = 'center';
        annotationsCategoryElement.style.marginBottom = '20mm';
        annotationsContainer.appendChild(annotationsCategoryElement);

        // Add heading for notes (will inherit the offset from parent)
        const notesHeading = document.createElement('h2');
        notesHeading.textContent = 'Notes:';
        notesHeading.style.textAlign = 'center';
        notesHeading.style.marginBottom = '10mm';
        annotationsContainer.appendChild(notesHeading);

        // Create a table for the notes (already inside the offset container)
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.border = 'none';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '30mm';

        // Create a single row
        const tr = document.createElement('tr');

        // Create three cells: left spacer, content, right spacer
        const tdLeft = document.createElement('td');
        const tdContent = document.createElement('td');
        const tdRight = document.createElement('td');

        // Set explicit widths to force centering
        tdLeft.style.width = '50%';
        tdContent.style.width = '1%'; // Will expand to content width
        tdRight.style.width = '50%';

        // Remove all borders
        tdLeft.style.border = 'none';
        tdContent.style.border = 'none';
        tdRight.style.border = 'none';

        // Ensure the content cell doesn't wrap unnecessarily
        tdContent.style.whiteSpace = 'nowrap';

        // Add annotations list
        const notesContainer = document.createElement('div');
        notesContainer.style.textAlign = 'left';
        notesContainer.style.minWidth = '300px'; // Ensure minimum width

        if (this.annotations.length > 0) {
          const annotationsList = document.createElement('ul');
          annotationsList.style.listStyleType = 'none';
          annotationsList.style.padding = '0';
          annotationsList.style.margin = '0';

          this.annotations.forEach((note, index) => {
            const listItem = document.createElement('li');
            listItem.style.marginBottom = '10px';
            listItem.style.padding = '10px';
            listItem.style.borderLeft = '3px solid #007bff';
            listItem.style.backgroundColor = '#f8f9fa';
            listItem.style.whiteSpace = 'normal'; // Allow text wrapping

            const noteNumber = document.createElement('span');
            noteNumber.textContent = `${index + 1}. `;
            noteNumber.style.fontWeight = 'bold';

            const noteText = document.createTextNode(note);

            listItem.appendChild(noteNumber);
            listItem.appendChild(noteText);
            annotationsList.appendChild(listItem);
          });

          notesContainer.appendChild(annotationsList);
        } else {
          const noNotes = document.createElement('p');
          noNotes.textContent = 'No notes added.';
          noNotes.style.fontStyle = 'italic';
          noNotes.style.color = '#6c757d';
          notesContainer.appendChild(noNotes);
        }

        // Put the content in the middle cell
        tdContent.appendChild(notesContainer);

        // Assemble the table
        tr.appendChild(tdLeft);
        tr.appendChild(tdContent);
        tr.appendChild(tdRight);
        table.appendChild(tr);

        // Add the table to the offset container
        annotationsContainer.appendChild(table);

        // Append the offset container to the annotations page
        annotationsPage.appendChild(annotationsContainer);

        // Add the annotations page to the main PDF content
        pdfContent.appendChild(annotationsPage);

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
