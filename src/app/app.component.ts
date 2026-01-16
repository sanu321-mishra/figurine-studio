import { Component } from '@angular/core';
import { FigurineDesignerComponent } from "./components/figurine-designer/figurine-designer.component";

@Component({
  selector: 'app-root',
  imports: [FigurineDesignerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'figurine-studio';
}
