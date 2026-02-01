import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
// Define the interface to match your C# model
export interface FigurineItem {
  id: string;
  userId: string;
  prompt: string;
  url: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FigurineService {
  private http = inject(HttpClient);

  // Existing signals
  currentImage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // NEW: Signal to store the history of figurines
  history = signal<FigurineItem[]>([]);

  generateFigurine(prompt: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.post<FigurineItem>(`${environment.azureFunctionBaseUrl}/savefigurine`, { prompt }).subscribe({
      next: (newItem) => {
        // 1. Set the main display image
        if (newItem && newItem.url) {
          this.preloadImage(newItem.url);
          this.currentImage.set(newItem.url);

          // 2. Add the new item to the TOP of the history list
          this.history.update(currentHistory => [newItem, ...currentHistory]);
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error generating figurine:', err);
        this.errorMessage.set('System overload. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Fetches the user's saved figurine history from Azure
   */
  getHistory(userId: string = 'test-user-123') {
    const historyUrl = `${environment.azureFunctionBaseUrl}/history/${userId}`;

    this.http.get<any[]>(historyUrl).subscribe({
      next: (data) => {
        // Replace the entire history array with data from Cosmos DB
        this.history.set(data);
      },
      error: (err) => {
        console.error('History Fetch Error:', err);
      }
    });
  }

  deleteFigurine(id: string) {
    const url = `${environment.azureFunctionBaseUrl}/figurine/${id}`;

    return this.http.delete(url).subscribe({
      next: () => {
        // Remove the item from the local history signal instantly
        this.history.update(items => items.filter(item => item.id !== id));

        // If the deleted image was the one currently being viewed, clear it
        if (this.currentImage()?.includes(id)) {
          this.currentImage.set(null);
        }
      },
      error: (err) => console.error('Delete failed', err)
    });
  }

  private preloader: HTMLImageElement | null = null;

  private preloadImage(imageUrl: string) {
    this.preloader = new Image();
    this.preloader.crossOrigin = "anonymous";
    this.preloader.onload = () => {
      this.currentImage.set(imageUrl);
      this.isLoading.set(false);
      this.preloader = null;
    };
    this.preloader.src = imageUrl;
  }
}