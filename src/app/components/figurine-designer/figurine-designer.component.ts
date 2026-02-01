import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FigurineService } from '../../services/figurine.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-figurine-designer',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './figurine-designer.component.html',
  styleUrl: './figurine-designer.component.scss'
})
export class FigurineDesignerComponent implements OnInit {
  figurineService = inject(FigurineService);

  userPrompt = signal<string>('');
  sidebarOpen = signal<boolean>(false);

  ngOnInit() {
    // Current user is guaranteed to be set because this component is guarded by @if(currentUser) in parent
    const user = this.figurineService.currentUser();
    if (user && user.userId) {
      this.figurineService.getHistory(user.userId);
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  onGenerate() {
    if (this.userPrompt().trim()) {
      this.figurineService.generateFigurine(this.userPrompt());
      // On mobile, maybe close sidebar if it was open? (optional, but good UX)
      this.closeSidebar();
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

  onSelectFromHistory(item: any) {
    // Quickly preview a past design
    this.figurineService.currentImage.set(item.url);
    this.userPrompt.set(item.prompt); // correct way to set signal
    // Close sidebar on selection for mobile
    this.closeSidebar();
  }

  onDelete(event: Event, item: any) {
    event.stopPropagation(); // Prevent triggering the card selection
    if (confirm('Are you sure you want to delete this design?')) {
      this.figurineService.deleteFigurine(item.id, item.userId);

      // If the deleted item is currently displayed, clear the main view
      if (this.figurineService.currentImage() === item.url) {
        this.figurineService.currentImage.set(null);
        this.userPrompt.set('');
      }
    }
  }
}