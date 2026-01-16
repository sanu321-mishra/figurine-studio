import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FigurineService } from '../../services/figurine.service';

@Component({
  selector: 'app-figurine-designer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './figurine-designer.component.html',
  styleUrl: './figurine-designer.component.scss'
})
export class FigurineDesignerComponent {
  figurineService = inject(FigurineService);

  userPrompt = signal<string>('');

  onGenerate() {
    if (this.userPrompt().trim()) {
      this.figurineService.generateFigurine(this.userPrompt());
    }
  }

  async onDownload() {
    const imageUrl = this.figurineService.currentImage();
    if (!imageUrl) return;

    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `figurine-${Date.now()}.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }
}