import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { routes } from './app/app.routes';
import { LucideAngularModule, Edit, Trash2, Bot, Megaphone, Eye, X, MessageCircle, AlertTriangle, Play, Archive, ChevronUp, GripVertical, Check, ArrowRight } from 'lucide-angular';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(HttpClientModule),
    importProvidersFrom(LucideAngularModule.pick({ Edit, Trash2, Bot, Megaphone, Eye, X, MessageCircle, AlertTriangle, Play, Archive, ChevronUp, GripVertical, Check, ArrowRight }))
  ]
}).catch(err => console.error(err));
