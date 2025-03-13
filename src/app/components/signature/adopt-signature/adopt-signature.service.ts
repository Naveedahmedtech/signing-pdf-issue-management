import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdoptSignatureService {
  
  private fileIdSubject = new BehaviorSubject<string | null>(null);
  private filePathSubject = new BehaviorSubject<string | null>(null);
  private orderIdSubject = new BehaviorSubject<string | null>(null);
  private userIdSubject = new BehaviorSubject<string | null>(null);

  fileId$ = this.fileIdSubject.asObservable();
  filePath$ = this.filePathSubject.asObservable();
  orderId$ = this.orderIdSubject.asObservable();
  userId$ = this.userIdSubject.asObservable();

  setFileId(fileId: string | null) {
    this.fileIdSubject.next(fileId);
  }

  setFilePath(filePath: string | null) {
    this.filePathSubject.next(filePath);
  }

  setOrderId(orderId: string | null) {
    this.orderIdSubject.next(orderId);
  }

  setUserId(userId: string | null) {
    this.userIdSubject.next(userId);
  }

  getFileId(): string | null {
    return this.fileIdSubject.value;
  }

  getFilePath(): string | null {
    return this.filePathSubject.value;
  }

  getOrderId(): string | null {
    return this.orderIdSubject.value;
  }

  getUserId(): string | null {
    return this.userIdSubject.value;
  }
}
