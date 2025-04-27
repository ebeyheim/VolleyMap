import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from '@angular/common'; // Import CommonModule
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';




@Component({
  selector: 'app-saved-maps',
  standalone: true, // Declare this as a standalone component
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule], // Add FormsModule here
  templateUrl: './saved-maps.component.html',
  styleUrls: ['./saved-maps.component.scss'],
})

export class SavedMapsComponent implements OnInit {
  plays: any[] = []; // All saved plays
  filteredPlays: any[] = []; // Plays filtered by category
  categories: string[] = []; // List of categories
  selectedCategory: string = 'All'; // Currently selected category
  selectedPlays: Set<number> = new Set(); // Track selected plays for deletion/download

  constructor(private http: HttpClient, private router: Router) {}


  

  ngOnInit(): void {
    this.fetchPlays();
    this.fetchCategories();
  }

  navigateToPlayCreation(): void {
    this.router.navigate(['/play-creation']);
  }

  onThumbnailError(play: any): void {
    play.thumbnail_name = 'placeholder.png'; // Use a default placeholder image
  }
  

  // Fetch all plays from the backend
  fetchPlays(): void {
    this.http.get('http://127.0.0.1:5000/uploads').subscribe(
      (response: any) => {
        this.plays = response.map((play: any) => ({
          ...play,
          thumbnail_name: play.file_name.replace('.pdf', '_thumb.png'), // No category in path
        }));
        console.log(this.plays); // Debugging: Check the thumbnail paths
        this.filteredPlays = this.plays; // Initially show all plays
      },
      (error) => {
        console.error('Error fetching plays:', error);
      }
    );
  }
  
  
  

  // Fetch all categories from the backend
  fetchCategories(): void {
    this.http.get('http://127.0.0.1:5000/categories').subscribe(
      (response: any) => {
        this.categories = response;
      },
      (error) => {
        console.error('Error fetching categories:', error);
      }
    );
  }

  // Filter plays by the selected category
  filterPlaysByCategory(): void {
    if (this.selectedCategory === 'All') {
      this.filteredPlays = this.plays;
    } else {
      this.filteredPlays = this.plays.filter(
        (play) => play.category === this.selectedCategory
      );
    }
  }

  // Create a new category
  createCategory(): void {
    const categoryName = prompt('Enter new category name:');
    if (categoryName) {
      this.http.post('http://127.0.0.1:5000/categories', { name: categoryName }).subscribe(
        () => {
          alert('Category created successfully!');
          this.fetchCategories();
        },
        (error) => {
          console.error('Error creating category:', error);
        }
      );
    }
  }

  // Toggle play selection for deletion/download
  togglePlaySelection(playId: number): void {
    if (this.selectedPlays.has(playId)) {
      this.selectedPlays.delete(playId);
    } else {
      this.selectedPlays.add(playId);
    }
  }

  // Delete selected plays
  deleteSelectedPlays(): void {
    if (this.selectedPlays.size === 0) {
      alert('No plays selected for deletion.');
      return;
    }

    const confirmDelete = confirm('Are you sure you want to delete the selected plays?');
    if (confirmDelete) {
      const deleteRequests = Array.from(this.selectedPlays).map((playId) =>
        this.http.delete(`http://127.0.0.1:5000/uploads/${playId}`).toPromise()
      );

      Promise.all(deleteRequests)
        .then(() => {
          alert('Selected plays deleted successfully!');
          this.selectedPlays.clear();
          this.fetchPlays();
        })
        .catch((error) => {
          console.error('Error deleting plays:', error);
        });
    }
  }

  // Download selected plays
  downloadSelectedPlays(): void {
    if (this.selectedPlays.size === 0) {
      alert('No plays selected for download.');
      return;
    }

    this.selectedPlays.forEach((playId) => {
      window.open(`http://127.0.0.1:5000/uploads/${playId}`, '_blank');
    });
  }

  // Add a new play (redirect to play creation page)
  addNewPlay(): void {
    alert('Redirecting to play creation page...');
    // Implement navigation logic here (e.g., using Angular Router)
    // this.router.navigate(['/play-creation']);
  }

  deleteCategory(): void {
    if (!this.selectedCategory || this.selectedCategory === 'All' || this.selectedCategory === 'Uncategorized') {
      alert('This category cannot be deleted.');
      return;
    }
  
    const confirmDelete = confirm(`Are you sure you want to delete the category "${this.selectedCategory}"? This will delete all plays in this category.`);
    if (confirmDelete) {
      this.http.delete(`http://127.0.0.1:5000/categories/${this.selectedCategory}`).subscribe(
        () => {
          alert(`Category "${this.selectedCategory}" deleted successfully!`);
          this.selectedCategory = 'All'; // Reset the selected category
          this.fetchCategories(); // Refresh the category list
          this.fetchPlays(); // Refresh the plays list
        },
        (error) => {
          console.error('Error deleting category:', error);
          alert('An error occurred while deleting the category.');
        }
      );
    }
  }
  
}


