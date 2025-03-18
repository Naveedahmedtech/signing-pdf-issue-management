import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root' // Makes it available globally
})
export class EventCommunicationService {
  // Define an EventEmitter that other components can subscribe to
  statusUpdated: EventEmitter<boolean> = new EventEmitter<boolean>();

  // Function to emit a new status
  updateStatus(newStatus: boolean) {
    this.statusUpdated.emit(newStatus);
  }
}
