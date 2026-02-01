import { Component, inject } from '@angular/core';
import { FigurineDesignerComponent } from "./components/figurine-designer/figurine-designer.component";
import { HeaderComponent } from "./components/header/header.component";
import { FigurineService } from "./services/figurine.service";

@Component({
  selector: 'app-root',
  imports: [FigurineDesignerComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'figurine-studio';
  figurineService = inject(FigurineService);
  currentUser = this.figurineService.currentUser;

  constructor() {
    this.figurineService.getUserInfo();
  }
}
