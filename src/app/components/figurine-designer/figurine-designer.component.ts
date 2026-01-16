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
}