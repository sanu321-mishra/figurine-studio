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

  // NEW: specific signal for auth user
  currentUser = signal<any>(null);

  async getUserInfo() {
    try {
      const response = await fetch('/.auth/me');
      const payload = await response.json();
      const user = payload.clientPrincipal;
      this.currentUser.set(user); // Update state
      return user;
    } catch {
      this.currentUser.set(null);
      return null;
    }
  }

  async getUserId(): Promise<string> {
    const clientPrincipal = await this.getUserInfo();
    return clientPrincipal ? clientPrincipal.userId : 'guest-user';
  }

  async generateFigurine(prompt: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const userId = await this.getUserId();

    return this.http.post<FigurineItem>(`${environment.azureFunctionBaseUrl}/savefigurine`, { prompt, userId }).subscribe({
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

  deleteFigurine(id: string, userId: string) {
    // New URL structure: /api/figurine/USER_ID/ITEM_ID
    const url = `${environment.azureFunctionBaseUrl}/figurine/${userId}/${id}`;

    return this.http.delete(url).subscribe({
      next: () => {
        // Remove from the local history signal so the UI updates instantly
        this.history.update(items => items.filter(item => item.id !== id));
      },
      error: (err) => console.error("Delete failed", err)
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