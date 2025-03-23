import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  constructor() { }

  generatePdf(courtElement: HTMLElement, playTitle: string, annotations: string[], category: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
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
        pdf.text(playTitle, pdfWidth / 2, 10, { align: 'center' });

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
        pdf.text(playTitle, pdfWidth / 2, 10, { align: 'center' });

        // Add annotations
        pdf.setFontSize(12);
        let annotationY = 20; // Start below the title
        annotations.forEach((annotation, index) => {
          if (annotationY > pdfHeight - 20) {
            pdf.addPage();
            pdf.setFontSize(16);
            pdf.text(playTitle, pdfWidth / 2, 10, { align: 'center' }); // Add title to new page
            annotationY = 20; // Reset Y position for the new page
          }
          pdf.text(`${index + 1}. ${annotation}`, 10, annotationY);
          annotationY += 10; // Line spacing
        });

        const pdfBlob = pdf.output('blob');
        resolve(pdfBlob);
      }).catch((error) => {
        reject(error);
      });
    });
  }
}