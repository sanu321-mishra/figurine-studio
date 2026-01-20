import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class FigurineService {
  private http = inject(HttpClient); // Modern injection pattern

  // Signals to track state reactively
  currentImage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  generateFigurine(prompt: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const url = `${environment.azureOpenAIEndpoint}/openai/deployments/${environment.deploymentName}/images/generations?api-version=2024-02-01`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'api-key': environment.azureOpenAIApiKey
    });

    const body = {
      prompt: prompt,
      n: 1,
      size: "1024x1024" // Smaller size for faster downloads
    };

    // Make the POST request to Azure OpenAI
    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        const imageUrl = response.data[0].url;
        // Preload the image before showing it
        this.preloadImage(imageUrl);
      },
      error: (err) => {
        console.error('API Error:', err);
        this.errorMessage.set('Failed to generate figurine. Check console for details.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Preloads an image before displaying it.
   * This ensures the loading state stays active until the image is fully downloaded.
   */
  private preloadImage(imageUrl: string) {
    const img = new Image();
    img.onload = () => {
      this.currentImage.set(imageUrl);
      this.isLoading.set(false);
    };
    img.onerror = () => {
      this.errorMessage.set('Failed to load image. Please try again.');
      this.isLoading.set(false);
    };
    img.src = imageUrl;
  }
}