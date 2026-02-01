import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Important for *ngIf if I use it, or just generic imports
import { FigurineService } from '../../services/figurine.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {
    figurineService = inject(FigurineService);
    currentUser = this.figurineService.currentUser;
}
